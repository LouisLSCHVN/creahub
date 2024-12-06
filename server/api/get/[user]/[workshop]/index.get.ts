export default defineEventHandler(async (event) => {
    const { user: username, workshop: workshopName } = getRouterParams(event)
    const { user: currentUser } = await getUserSession(event)

    const [user] = await useDrizzle().select().from(tables.user).where(eq(tables.user.name, username))

    if (!user) {
        return createHttpResponse({
            message: 'User Not Found',
            status: 404
        })
    }

    const workshopWithBranches = await useDrizzle()
        .select({
            workshop: tables.workshop,
            branch: tables.branch
        })
        .from(tables.workshop)
        .leftJoin(tables.branch, eq(tables.workshop.id, tables.branch.workshopId))
        .where(eq(tables.workshop.name, workshopName));

    if (!workshopWithBranches.length) {
        return createHttpResponse({
            message: 'Workshop Not Found',
            status: 404
        })
    }

    // Restructurer les données
    const workshop = workshopWithBranches[0].workshop;
    const branches = workshopWithBranches.map(row => row.branch).filter(Boolean);

    if (workshop.visibility !== 'public' && String(currentUser?.id) !== String(workshop.ownerId)) {
        return createHttpResponse({
            message: 'Not Found',
            status: 404
        })
    }

    return createHttpResponse({
        status: 200,
        message: 'Workshop Found',
        data: {
            ...workshop,
            branches
        }
    })
})