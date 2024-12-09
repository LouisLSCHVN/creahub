import { eq, and, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
    console.log('Début du traitement de l\'upload de fichier.')

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

        // Extraire les données du formulaire
        const fileItem = body.find(item => item.name === 'file')
        const branchIdRaw = body.find(item => item.name === 'branchId')?.data
        const workshopIdRaw = body.find(item => item.name === 'workshopId')?.data
        let folderIdRaw = body.find(item => item.name === 'folderId')?.data
        console.log('Données extraites du formulaire :', fileItem, branchIdRaw, workshopIdRaw, folderIdRaw)
        let folderId: number | null
        if (folderIdRaw && folderIdRaw.length > 0) {
            const folderIdStr = Buffer.from(folderIdRaw).toString()
            folderId = folderIdStr ? Number(folderIdStr) : null
        } else {
            folderId = null
        }
        console.log('folderId converti en nombre :', folderId)

        // Convertir les données des ID depuis des Buffers vers des chaînes puis vers des nombres
        const branchId = branchIdRaw ? parseInt(Buffer.from(branchIdRaw).toString()) : NaN
        const workshopId = workshopIdRaw ? parseInt(Buffer.from(workshopIdRaw).toString()) : NaN

        // Vérifier que les champs requis sont présents
        if (!fileItem || !fileItem.filename || !fileItem.data) {
            console.warn('Fichier manquant ou invalide.')
            return createHttpResponse({ status: 400, message: 'Missing required fields' })
        }

        const fileName = fileItem.filename
        const fileType = fileItem.type
        const fileBuffer = fileItem.data as Buffer

        console.log(`Fichier sélectionné : ${fileName}`)
        console.log(`branchId : ${branchId}, workshopId : ${workshopId}, folderId : ${folderId}`)

        if (!fileName || isNaN(branchId) || isNaN(workshopId)) {
            console.warn('Champs requis manquants ou invalides.')
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

        // Modifier la logique de vérification du folderId
        if (!folderId) { // Vérifie si folderId est null ou 0
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

        // Stocker le fichier dans le stockage blob
        console.log('Validation du fichier avec ensureBlob.')
        ensureBlob(fileBlob, { maxSize: '1GB' }) // Ajustez la taille maximale si nécessaire
        console.log('Fichier validé. Début du téléchargement vers le blob storage.')

        const blobPath = `workshops/${workshopId}/branches/${branchId}/files/${fileName}`
        console.log(`Chemin du blob : ${blobPath}`)

        const blobResult = await hubBlob().put(blobPath, fileBlob, {
            addRandomSuffix: false
        })
        console.log('Fichier téléchargé dans le blob storage :', blobResult)

        const path = blobResult.pathname
        console.log(`Chemin du fichier dans le storage : ${path}`)

        // Insérer le fichier dans la base de données
        const newFile = {
            workshopId: workshopId,
            branchId: branchId,
            name: fileName,
            path: path,
            folderId: folderId,
            fileType: fileType!.startsWith('image/') ? 'image' as 'image' :
                      fileType!.startsWith('video/') ? 'video' as 'video' : 'link' as 'link',
            size: fileBuffer.length, // Utilisez fileBuffer.length pour la taille
            version: version,
            previousVersionId: previousVersionId,
            createdAt: new Date(),
            updatedAt: new Date(),
        }

        console.log('Insertion du nouveau fichier dans la base de données :', newFile)
        await db.insert(tables.file).values(newFile)
        console.log('Fichier inséré avec succès dans la base de données.')

        console.log('Upload de fichier terminé avec succès.')
        return {
            status: 200,
            message: 'File uploaded successfully',
            data: newFile
        }

    } catch (error) {
        console.error('Erreur lors du traitement de l\'upload du fichier :', error)
        return createHttpResponse({ status: 500, message: 'Internal Server Error' })
    }
})