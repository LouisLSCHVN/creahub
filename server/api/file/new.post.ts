import { eq, and, inArray, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
    console.log('Début du traitement de l\'upload de fichiers multiples.')

    try {
        const { user } = await getUserSession(event)
        console.log('Utilisateur récupéré :', user)

        if (!user) {
            console.warn('Utilisateur non authentifié.')
            return createHttpResponse({ status: 401, message: 'Unauthorized' })
        }

        const body = await readMultipartFormData(event)
        console.log('Données du formulaire récupérées :', body)

        if (!body) {
            console.warn('Aucune donnée fournie dans la requête.')
            return createHttpResponse({ status: 400, message: 'No data provided' })
        }

        // Extraire les données du formulaire (autres que les fichiers)
        const branchIdRaw = body.find(item => item.name === 'branchId')?.data
        const workshopIdRaw = body.find(item => item.name === 'workshopId')?.data
        let folderIdRaw = body.find(item => item.name === 'folderId')?.data

        // Extraire tous les fichiers
        const fileItems = body.filter(item => item.name === 'file' && item.filename && item.data)

        if (!fileItems || fileItems.length === 0) {
            console.warn('Aucun fichier fourni.')
            return createHttpResponse({ status: 400, message: 'No files provided' })
        }

        console.log(`Nombre de fichiers détectés : ${fileItems.length}`)

        let folderId: number | null
        if (folderIdRaw && folderIdRaw.length > 0) {
            folderId = Number(Buffer.from(folderIdRaw).toString())
        } else {
            folderId = null
        }

        // Convertir les données des ID depuis des Buffers vers des nombres
        const branchId = branchIdRaw ? parseInt(Buffer.from(branchIdRaw).toString()) : NaN
        const workshopId = workshopIdRaw ? parseInt(Buffer.from(workshopIdRaw).toString()) : NaN

        // Vérifier les champs requis
        if (isNaN(branchId) || isNaN(workshopId)) {
            console.warn('Champs requis manquants ou invalides (branchId ou workshopId).')
            return createHttpResponse({ status: 400, message: 'Missing or invalid required fields' })
        }

        const db = useDrizzle();
        console.log('Connexion à la base de données établie.')

        // Récupérer workshop, branch, owner en une seule fois
        const [existingBranch, workshop, workshopOwner] = await Promise.all([
            db.select().from(tables.branch).where(eq(tables.branch.id, branchId)).get(),
            db.select().from(tables.workshop).where(eq(tables.workshop.id, workshopId)).get(),
            // On attend d'avoir le workshop pour récupérer l'owner
        ]).then(async ([b, w]) => {
            if (!b) {
                console.warn('Branche non trouvée.')
                throw createHttpResponse({ status: 404, message: 'Branch not found' })
            }
            if (!w) {
                console.error('Atelier introuvable :', workshopId)
                throw createHttpResponse({ status: 404, message: 'Workshop not found' })
            }
            const owner = await db.select().from(tables.user).where(eq(tables.user.id, w.ownerId)).get()
            if (!owner) {
                console.error('Propriétaire de l\'atelier introuvable :', w.ownerId)
                throw createHttpResponse({ status: 404, message: 'Workshop owner not found' })
            }
            return [b, w, owner] as const
        })

        const branch = existingBranch
        console.log('Workshop récupéré :', workshop.name)
        console.log('Propriétaire du workshop :', workshopOwner.name)
        console.log('Branche récupérée :', branch.name)

        // Déterminer le folderId final (root si aucun spécifié)
        if (!folderId) {
            console.log('Récupération du dossier root de la branche...')
            const rootFolder = await db
                .select()
                .from(tables.folder)
                .where(and(
                    eq(tables.folder.name, 'root'),
                    eq(tables.folder.branchId, branchId)
                ))
                .get()

            if (!rootFolder) {
                console.error('Dossier root introuvable dans la branche:', branchId)
                return createHttpResponse({ status: 400, message: 'Dossier root introuvable' })
            }
            folderId = rootFolder.id
            console.log(`folderId assigné au dossier root : ${folderId}`)
        } else {
            // Vérifier que le folderId existe
            const folderExists = await db
                .select({ id: tables.folder.id })
                .from(tables.folder)
                .where(eq(tables.folder.id, folderId))
                .get()

            if (!folderExists) {
                console.error('Dossier invalide:', folderId)
                return createHttpResponse({ status: 400, message: 'Dossier invalide' })
            }
        }

        // Construire le chemin du dossier
        // Idéalement, on a stocké `full_path` en DB. Si pas possible, on récupère la hiérarchie
        const folderPath = await getFolderPath(db, folderId) // Implémentez cette fonction pour éviter la boucle, ou gardez la logique initiale si nécessaire.

        // Préparer une liste de noms de fichiers pour la vérification des versions
        const fileNames = fileItems.map(item => item.filename!)

        // Récupérer toutes les versions existantes pour ces fichiers en une seule requête
        const existingFiles = await db.select().from(tables.file)
            .where(
                and(
                    eq(tables.file.branchId, branchId),
                    eq(tables.file.folderId, folderId),
                    inArray(tables.file.name, fileNames)
                )
            )
            .orderBy(desc(tables.file.version))
            .all() // Récupérer tous, pas qu'un seul

        // Créer un map {filename: currentMaxVersion}
        const maxVersionsByFile: Record<string, {version: number, id: number|null}> = {}
        for (const ef of existingFiles) {
            // Le premier fichier rencontré avec ce nom est la plus grande version (trié desc)
            if (!maxVersionsByFile[ef.name]) {
                maxVersionsByFile[ef.name] = { version: ef.version, id: ef.id }
            }
        }

        // Paralléliser l'upload vers le blob storage
        const uploads = fileItems.map(async (fileItem) => {
            const fileName = fileItem.filename!
            const fileType = fileItem.type || ''
            const fileBuffer = fileItem.data as Buffer

            if (!fileBuffer) {
                console.warn(`Fichier manquant ou invalide pour ${fileName}.`)
                throw createHttpResponse({ status: 400, message: 'Missing required fields for a file' })
            }

            const existingFileData = maxVersionsByFile[fileName]
            let version = 1
            let previousVersionId = null
            if (existingFileData) {
                version = existingFileData.version + 1
                previousVersionId = existingFileData.id
            }

            // Créer un Blob
            const fileBlob = new Blob([fileBuffer], { type: fileType })

            // Valider le blob
            ensureBlob(fileBlob, { maxSize: '1GB' })

            // Construire le chemin du blob avec version si souhaité
            const extIndex = fileName.lastIndexOf('.')
            const baseName = extIndex === -1 ? fileName : fileName.substring(0, extIndex)
            const ext = extIndex === -1 ? '' : fileName.substring(extIndex)
            const versionedFileName = `${baseName}_v${version}${ext}`

            const blobPath = `${workshopOwner.name}/${workshop.name}/${branch.name}/${folderPath ? folderPath + '/' : ''}${versionedFileName}`

            // Envoyer le fichier dans le blob storage
            const blobResult = await hubBlob().put(blobPath, fileBlob, { addRandomSuffix: false })

            let fileCategory: 'image' | 'video' | 'link' = 'link'
            if (fileType.startsWith('image/')) fileCategory = 'image'
            else if (fileType.startsWith('video/')) fileCategory = 'video'

            return {
                workshopId: workshopId,
                branchId: branchId,
                name: fileName,
                path: blobResult.pathname,
                folderId: folderId!,
                fileType: fileCategory,
                size: fileBuffer.length,
                version,
                previousVersionId,
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        })

        const newFiles = await Promise.all(uploads)

        // Insérer tous les fichiers en une fois (si votre BDD le permet)
        // Sinon, vous pouvez faire un Promise.all(...) sur les insertions
        for (const f of newFiles) {
            await db.insert(tables.file).values(f)
        }

        console.log('Upload de tous les fichiers terminé avec succès.')

        return {
            status: 200,
            message: 'Files uploaded successfully',
            data: newFiles
        }

    } catch (error) {
        console.error('Erreur lors du traitement de l\'upload des fichiers :', error)
        return createHttpResponse({ status: 500, message: 'Internal Server Error' })
    }
})

async function getFolderPath(db: ReturnType<typeof useDrizzle>, folderId: number): Promise<string> {
    // Idéalement, vous avez une colonne 'full_path' dans 'folder'.
    // Si non, on fait un seul appel pour récupérer tous les dossiers ancêtres en une requête.
    // Exemple simplifié (pseudo code) :

    // Récupérer tous les parents du dossier en une seule requête
    // Dans drizzle-orm, vous pouvez soit faire plusieurs appels,
    // soit stocker le full_path en BD.

    // Pour la démonstration, on garde votre logique initiale mais on limite au strict nécessaire:
    const folders: string[] = []
    let currentFolderId = folderId
    while (currentFolderId) {
        const folder = await db.select().from(tables.folder)
            .where(eq(tables.folder.id, currentFolderId))
            .get()
        if (!folder) break
        if (folder.name !== 'root') {
            folders.push(folder.name)
        }
        currentFolderId = folder.parentFolderId!
    }
    return folders.reverse().join('/')
}
