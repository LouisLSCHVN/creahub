import { eq, and, desc } from 'drizzle-orm'

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
            const folderIdStr = Buffer.from(folderIdRaw).toString()
            folderId = folderIdStr ? Number(folderIdStr) : null
        } else {
            folderId = null
        }
        console.log('folderId converti en nombre :', folderId)

        // Convertir les données des ID depuis des Buffers vers des nombres
        const branchId = branchIdRaw ? parseInt(Buffer.from(branchIdRaw).toString()) : NaN
        const workshopId = workshopIdRaw ? parseInt(Buffer.from(workshopIdRaw).toString()) : NaN

        // Vérifier que les champs requis sont présents
        if (isNaN(branchId) || isNaN(workshopId)) {
            console.warn('Champs requis manquants ou invalides (branchId ou workshopId).')
            return createHttpResponse({ status: 400, message: 'Missing or invalid required fields' })
        }

        const db = useDrizzle();
        console.log('Connexion à la base de données établie.')

        // Vérifier si la branche existe
        const existingBranch = await db.select().from(tables.branch).where(eq(tables.branch.id, branchId)).get()
        console.log('Résultat de la vérification de la branche :', existingBranch)

        if (!existingBranch) {
            console.warn('Branche non trouvée.')
            return createHttpResponse({ status: 404, message: 'Branch not found' })
        }

        // Récupérer le nom du workshop
        const workshop = await db.select().from(tables.workshop)
            .where(eq(tables.workshop.id, workshopId))
            .get()

        if (!workshop) {
            console.error('Atelier introuvable :', workshopId)
            return createHttpResponse({ status: 404, message: 'Workshop not found' })
        }
        console.log('Workshop récupéré :', workshop.name)

        const workshopOwner = await db.select().from(tables.user).where(eq(tables.user.id, workshop.ownerId)).get()

        if (!workshopOwner) {
            console.error('Propriétaire de l\'atelier introuvable :', workshop.ownerId)
            return createHttpResponse({ status: 404, message: 'Workshop owner not found' })
        }

        // Récupérer le nom de la branche
        const branch = await db.select().from(tables.branch)
            .where(eq(tables.branch.id, branchId))
            .get()

        if (!branch) {
            console.error('Branche introuvable :', branchId)
            return createHttpResponse({ status: 404, message: 'Branch not found' })
        }
        console.log('Branche récupérée :', branch.name)

        // Construire la hiérarchie des dossiers
        let folderPath = ''
        if (folderId) {
            let currentFolderId = folderId
            const folders = []

            while (currentFolderId) {
                const folder = await db.select().from(tables.folder)
                    .where(eq(tables.folder.id, currentFolderId))
                    .get()

                if (folder) {
                    folders.push(folder.name)
                    currentFolderId = folder.parentFolderId!
                } else {
                    break
                }
            }

            // Les dossiers sont empilés du plus profond au plus haut, nous devons les inverser
            folderPath = folders.reverse().join('/')
        }
        console.log('Chemin des dossiers :', folderPath)

        // Vérifier ou récupérer le folderId (root si pas fourni)
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
            const folder = await db
                .select()
                .from(tables.folder)
                .where(eq(tables.folder.id, folderId))
                .get()

            if (!folder) {
                console.error('Dossier invalide:', folderId)
                return createHttpResponse({ status: 400, message: 'Dossier invalide' })
            }
        }

        const uploadedFiles: any[] = []

        // Traiter chaque fichier individuellement
        for (const fileItem of fileItems) {
            const fileName = fileItem.filename
            const fileType = fileItem.type
            const fileBuffer = fileItem.data as Buffer

            console.log(`Fichier sélectionné : ${fileName}`)

            if (!fileName || !fileBuffer) {
                console.warn(`Fichier manquant ou invalide pour ${fileName}.`)
                return createHttpResponse({ status: 400, message: 'Missing required fields for a file' })
            }

            // Vérifier si le fichier existe déjà
            const existingFile = await db.select().from(tables.file)
                .where(
                    and(
                        eq(tables.file.name, fileName),
                        eq(tables.file.branchId, branchId),
                        eq(tables.file.folderId, folderId)
                    )
                )
                .orderBy(desc(tables.file.version))
                .limit(1)
                .get()

            console.log('Résultat de la vérification des fichiers existants :', existingFile)

            let version = 1
            let previousVersionId = null
            if (existingFile) {
                version = existingFile.version + 1
                previousVersionId = existingFile.id
                console.log(`Fichier existant trouvé. Incrémentation de la version à ${version} et définition de previousVersionId à ${previousVersionId}.`)
            } else {
                console.log('Aucun fichier existant trouvé. Initialisation de la version à 1.')
            }

            // Créer un Blob à partir du Buffer
            const fileBlob = new Blob([fileBuffer], { type: fileType })
            console.log('Blob créé à partir du Buffer.')

            // Valider le fichier
            console.log('Validation du fichier avec ensureBlob.')
            ensureBlob(fileBlob, { maxSize: '1GB' })
            console.log('Fichier validé. Début du téléchargement vers le blob storage.')

            // Construire le chemin du blob
            const blobPath = `${workshopOwner.name}/${workshop.name}/${branch.name}/${folderPath ? folderPath + '/' : ''}${fileName}`
            console.log(`Chemin du blob : ${blobPath}`)

            // Envoyer le fichier dans le blob storage
            const blobResult = await hubBlob().put(blobPath, fileBlob, {
                addRandomSuffix: false
            })
            console.log('Fichier téléchargé dans le blob storage :', blobResult)

            const path = blobResult.pathname
            console.log(`Chemin du fichier dans le storage : ${path}`)

            // Déterminer le type de fichier (image, video, link)
            let fileCategory: 'image' | 'video' | 'link' = 'link'
            if (fileType && fileType.startsWith('image/')) {
                fileCategory = 'image'
            } else if (fileType && fileType.startsWith('video/')) {
                fileCategory = 'video'
            }

            // Préparer l'objet fichier à insérer en DB
            const newFile = {
                workshopId: workshopId,
                branchId: branchId,
                name: fileName,
                path: path,
                folderId: folderId,
                fileType: fileCategory,
                size: fileBuffer.length,
                version: version,
                previousVersionId: previousVersionId,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            console.log('Insertion du nouveau fichier dans la base de données :', newFile)
            await db.insert(tables.file).values(newFile)
            console.log('Fichier inséré avec succès dans la base de données.')

            uploadedFiles.push(newFile)
        }

        console.log('Upload de tous les fichiers terminé avec succès.')
        return {
            status: 200,
            message: 'Files uploaded successfully',
            data: uploadedFiles
        }

    } catch (error) {
        console.error('Erreur lors du traitement de l\'upload des fichiers :', error)
        return createHttpResponse({ status: 500, message: 'Internal Server Error' })
    }
})
