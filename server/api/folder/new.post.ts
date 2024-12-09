import { eq, and } from 'drizzle-orm' // Importez les opérateurs nécessaires

export default defineEventHandler(async (event) => {
    const { user } = await getUserSession(event)
    console.log('User:', user)

    if (!user) {
        return createHttpResponse({ status: 401, message: 'Unauthorized' })
    }

    const body = await readBody(event);
    console.log('Received body:', body) // Vérifier les données reçues

    const db = useDrizzle();

    try {
        let parentFolderId = body.parentFolderId

        if (!parentFolderId) {
            console.log('parentFolderId non fourni. Récupération du folder root de la branche...')
            // Récupérer le dossier root de la branche
            const rootFolder = await db
                .select()
                .from(tables.folder)
                .where(and(
                    eq(tables.folder.name, 'root'),
                    eq(tables.folder.branchId, body.branchId)
                ))
                .get()

            console.log('Root folder:', rootFolder)

            if (!rootFolder) {
                return createHttpResponse({
                    status: 400,
                    message: 'Dossier root introuvable dans cette branche'
                })
            }

            parentFolderId = rootFolder.id
        } else {
            // Vérifier que le parentFolderId existe
            const parentFolder = await db
                .select()
                .from(tables.folder)
                .where(eq(tables.folder.id, parentFolderId))
                .get()

            console.log('Parent folder:', parentFolder)

            if (!parentFolder) {
                return createHttpResponse({
                    status: 400,
                    message: 'parentFolderId invalide'
                })
            }
        }

        // Vérifier l'existence d'un dossier avec le même nom dans le même parent
        const existingFolder = await db
            .select()
            .from(tables.folder)
            .where(and(
                eq(tables.folder.name, body.title),
                eq(tables.folder.branchId, body.branchId),
                eq(tables.folder.parentFolderId, parentFolderId)
            ))
            .get();

        console.log('Existing folder:', existingFolder) // Vérifier si un dossier existe

        if (existingFolder) {
            return createHttpResponse({
                status: 400,
                message: 'Un dossier avec ce nom existe déjà dans ce parent'
            });
        }

        const newFolder = {
            name: body.title,
            description: body.description,
            userId: user.id,
            branchId: body.branchId,
            parentFolderId: parentFolderId,
            icon: body.icon || 'i-heroicons-folder',
            createdAt: new Date(),
            updatedAt: new Date()
        }
        console.log('Attempting to create folder with data:', newFolder) // Vérifier les données avant insertion

        // Insérer le nouveau dossier
        const newFolderResult = await db.insert(tables.folder).values(newFolder).returning()

        if (!newFolderResult[0]) {
            console.error('No last_row_id in result') // Logger l'erreur spécifique
            return createHttpResponse({
                status: 500,
                message: 'Erreur lors de la création du dossier'
            });
        }

        const createdFolder = newFolderResult[0]

        // Gérer les tags en une seule opération
        if (body.tags && body.tags.length > 0) {
            console.log('Processing tags:', body.tags) // Vérifier les tags
            await db.insert(tables.tag)
                .values(
                    body.tags.map(tagName => ({
                        name: tagName,
                        taggableId: createdFolder.id,
                        taggableType: 'folder',
                        createdAt: new Date()
                    }))
                )
                .run();
        }

        return createHttpResponse({
            status: 201,
            message: 'Dossier créé avec succès',
            data: { newFolder: createdFolder }
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