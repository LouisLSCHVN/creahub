import { eq } from 'drizzle-orm' // Importez les opérateurs nécessaires

export default defineEventHandler(async (event) => {
    const { user } = await getUserSession(event)
    if (!user) {
        return createHttpResponse({ status: 401, message: 'Unauthorized' })
    }

    const { workshopId, name } = await readBody(event)
    if (!workshopId || !name) {
        return createHttpResponse({ status: 400, message: 'Missing required fields' })
    }

    const db = useDrizzle()

    const [workshop] = await db.select().from(tables.workshop).where(eq(tables.workshop.id, workshopId))
    if (!workshop) {
        return createHttpResponse({ status: 404, message: 'Workshop not found' })
    }

    if (workshop.ownerId !== user.id) {
        return createHttpResponse({ status: 403, message: 'Forbidden' })
    }

    // Créer la nouvelle branche
    const branchResult = await db.insert(tables.branch).values({
        workshopId: Number(workshopId),
        name,
        createdAt: new Date(),
        updatedAt: new Date(),
    }).returning()

    console.log(branchResult)

    if (!branchResult[0]) {
        return createHttpResponse({ status: 500, message: 'Failed to create branch' })
    }

    const newBranch = branchResult[0]

    // Créer le dossier root pour la nouvelle branche
    const folderResult = await db.insert(tables.folder).values({
        branchId: newBranch.id,
        name: 'root',
        description: 'Root folder',
        icon: 'i-heroicons-folder',
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
    }).returning()

    console.log(folderResult)

    if (!folderResult[0]) {
        // Optionnel : Vous pouvez décider de supprimer la branche créée si la création du dossier échoue
        await db.delete(tables.branch).where(eq(tables.branch.id, newBranch.id))
        return createHttpResponse({ status: 500, message: 'Failed to create root folder' })
    }

    const rootFolder = folderResult[0]

    return createHttpResponse({
        status: 201,
        data: newBranch
    })
})