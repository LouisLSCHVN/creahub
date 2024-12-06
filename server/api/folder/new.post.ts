export default defineEventHandler(async (event) => {
    const { user } = await getUserSession(event)
    console.log('User:', user) // Vérifier l'utilisateur

    if(!user) {
        return createHttpResponse({ status: 401, message: 'Unauthorized' })
    }

    const body = await readBody(event);
    console.log('Received body:', body) // Vérifier les données reçues

    const db = useDrizzle();

    console.log('Checking for existing folder...') // Vérifier l'étape de recherche
    const existingFolder = await db
        .select()
        .from(tables.folder)
        .where(and(
            eq(tables.folder.name, body.title),
            eq(tables.folder.branchId, body.branchId)
        ))
        .get();

    console.log('Existing folder:', existingFolder) // Vérifier si un dossier existe

    if (existingFolder) {
        return createHttpResponse({
            status: 400,
            message: 'Un dossier avec ce nom existe déjà dans cette branche'
        });
    }

    const newFolder = {
        name: body.title,
        description: body.description,
        userId: user.id,
        branchId: body.branchId,
        parentFolderId: body.parentFolderId || 0,
        icon: body.icon || 'i-heroicons-folder',
        createdAt: new Date(),
        updatedAt: new Date()
    }
    console.log('Attempting to create folder with data:', newFolder) // Vérifier les données avant insertion

    try {
        // Log de la requête avant exécution
        const newFolderResult = await db.insert(tables.folder).values(newFolder);

        console.log('Insert result full details:', {
            result: newFolderResult,
            meta: newFolderResult.meta,
            changes: newFolderResult.changes
        });

        if(!newFolderResult.meta.last_row_id) {
            console.error('No last_row_id in result') // Logger l'erreur spécifique
            return createHttpResponse({
                status: 500,
                message: 'Erreur lors de la création du dossier'
            });
        }
        // Gérer les tags en une seule opération
        if (body.tags && body.tags.length > 0) {
            console.log('Processing tags:', body.tags) // Vérifier les tags
            await db.insert(tables.tag)
                .values(
                    body.tags.map(tagName => ({
                        name: tagName,
                        taggableId: newFolderResult.meta.last_row_id,
                        taggableType: 'folder',
                        createdAt: new Date()
                    }))
                )
                .run();
        }

        return createHttpResponse({
            status: 201,
            message: 'Dossier créé avec succès',
            data: {newFolder, id: newFolderResult.meta.last_row_id}
        });
    } catch (error) {
        // Log détaillé de l'erreur
        console.error('Detailed error information:', {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack,
            cause: error.cause,
            query: error.query,
            meta: error.meta
        });

        // Retourner une réponse plus détaillée
        return createHttpResponse({
            status: 500,
            message: 'Erreur lors de la création du dossier',
            details: {
                errorType: error.name,
                errorMessage: error.message,
                errorCode: error.code,
                queryError: error.query
            }
        });
    }
});