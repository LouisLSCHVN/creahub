import { eq, and, inArray } from 'drizzle-orm'
import { sql } from 'drizzle-orm/sql'

// Assurez-vous d'avoir les imports de `getRouterParams`, `getUserSession`, `createHttpResponse`, `sanitizeUser`, etc.
// ainsi que les tables depuis votre schéma Drizzle.

export default defineEventHandler(async (event) => {
    const { user: username, workshop: workshopName } = getRouterParams(event)
    const session = await getUserSession(event)
    const currentUser = session?.user

    console.log('Current User:', currentUser)

    const db = useDrizzle()

    const [user] = await db
        .select()
        .from(tables.user)
        .where(eq(tables.user.name, username))

    if (!user) {
        return createHttpResponse({
            message: 'User Not Found',
            status: 404
        })
    }

    // Récupérer les workshops selon la visibilité
    const workshops = await db
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

    let totalUsage = 0
    if (workshops.length > 0) {
        const workshopIds = workshops.map(w => w.id)
        // Récupérer la somme de toutes les tailles de fichiers appartenant à ces workshops
        const [usageResult] = await db
            .select({
                totalSize: sql<number>`SUM(${tables.file.size})`
            })
            .from(tables.file)
            .where(inArray(tables.file.workshopId, workshopIds))

        totalUsage = usageResult.totalSize ?? 0
    }

    return createHttpResponse({
        status: 200,
        message: 'User and Workshops Found',
        data: {
            user: sanitizeUser(user),
            workshops,
            totalUsage  // total en octets
        }
    })
})
