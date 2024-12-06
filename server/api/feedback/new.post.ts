import { z } from "zod";

export default defineEventHandler(async (event) => {
    const { user } = await getUserSession(event)
    if (!user) {
        return createHttpResponse({
            status: 401,
            message: 'Unauthorized'
        })
    }

    const body = await readValidatedBody(event, z.object({
        message: z.string().min(1, {
            message: 'Message must be at least 1 character long'
        }).max(500),
        title: z.string().min(1, {
            message: 'Title must be at least 1 character long'
        }).max(100)
    }).safeParseAsync);

    console.log(body)

    if (!body.success) {
        return createHttpResponse({
            status: 400,
            message: 'Invalid request body'
        })
    }

    console.log("Creating feedback")
    try {
        const result = await useDrizzle().insert(tables.appFeedback).values({
            message: body.data.message,
            title: body.data.title,
            userId: user.id,
            createdAt: new Date()
        })

        // Ajout de logs supplémentaires pour vérifier le résultat de l'insertion
        console.log("Result:", result)

        if (result.error) {
            console.log("Error:", result.error)
            return createHttpResponse({ status: 500, message: 'Failed to create feedback' })
        }

        console.log("Created feedback")
        console.log(result)

        return createHttpResponse({ status: 201, data: result.data })
    } catch (error) {
        console.error("Erreur lors de la création du feedback:", error)
        return createHttpResponse({ status: 500, message: 'Failed to create feedback' })
    }
})