export default defineEventHandler(async (event) => {
    const { user } = await getUserSession(event)
    if (!user) {
        return createHttpResponse({ status: 401 })
    }

    const { workshopId, name } = await readBody(event)
    if (!workshopId || !name) {
        return createHttpResponse({ status: 400 })
    }

    const [workshop] = await useDrizzle().select().from(tables.workshop).where(eq(tables.workshop.id, workshopId))
    if (!workshop) {
        return createHttpResponse({ status: 404 })
    }

    if (workshop.ownerId !== user.id) {
        return createHttpResponse({ status: 403 })
    }

    const result = await useDrizzle().insert(tables.branch).values({
        workshopId: Number(workshopId),
        name,
        createdAt: new Date(),
        updatedAt: new Date(),
    }).returning();

    console.log(result);

    if(!result[0]) {
        return createHttpResponse({ status: 500, message: 'Failed to create workshop' })
    }

    return createHttpResponse({ status: 201, data: result[0] })
})