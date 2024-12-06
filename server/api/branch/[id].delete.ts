export default defineEventHandler(async (event) => {
    const { user } = await getUserSession(event)
    if (!user) {
        return createHttpResponse({
            status: 401,
            message: 'Unauthorized'
        })
    }

    const id = Number(getRouterParam(event, 'id'))
    if (isNaN(id)) {
        return createHttpResponse({
            status: 400,
            message: 'Invalid ID'
        })
    }

    const branchWithWorkshop = await useDrizzle()
        .select({
            branch: tables.branch,
            workshop: tables.workshop
        })
        .from(tables.branch)
        .leftJoin(
            tables.workshop,
            eq(tables.branch.workshopId, tables.workshop.id)
        )
        .where(eq(tables.branch.id, id))

    if (branchWithWorkshop.length === 0) {
        return createHttpResponse({
            status: 404,
            message: 'Branch not found'
        })
    }

    if(branchWithWorkshop[0].branch.name === "main") {
        return createHttpResponse({
            status: 400,
            message: 'Cannot delete main branch'
        })
    }

    // Vérifier si l'utilisateur est le propriétaire du workshop
    if (!branchWithWorkshop[0].workshop || branchWithWorkshop[0].workshop.ownerId !== user.id) {
        return createHttpResponse({
            status: 403,
            message: 'Forbidden'
        })
    }

    const result = await useDrizzle()
        .delete(tables.branch)
        .where(eq(tables.branch.id, id))

    if (result.error) {
        return createHttpResponse({
            status: 500,
            message: 'Failed to delete branch'
        })
    }

    return createHttpResponse({ status: 204 })
})