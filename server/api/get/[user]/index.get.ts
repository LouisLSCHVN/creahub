export default defineEventHandler(async (event) => {
    const { user: username, workshop: workshopName } = getRouterParams(event)
    const session = await getUserSession(event)
    const currentUser = session?.user

    // Log pour vérifier la structure de currentUser
    console.log('Current User:', currentUser)

    const [user] = await useDrizzle()
        .select()
        .from(tables.user)
        .where(eq(tables.user.name, username))

    if (!user) {
        return createHttpResponse({
            message: 'User Not Found',
            status: 404
        })
    }

    // Requête conditionnelle pour les workshops
    const workshops = await useDrizzle()
        .select()
        .from(tables.workshop)
        .where(
            currentUser?.id === user.id
                ? eq(tables.workshop.ownerId, user.id)
                : and(
                    eq(tables.workshop.ownerId, user.id),
                    eq(tables.workshop.visibility, 'public')
                )
        )

    return createHttpResponse({
        status: 200,
        message: 'User and Workshops Found',
        data: {
            user: sanitizeUser(user),
            workshops
        }
    })
})