import { desc, sql, eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { user } = await getUserSession(event)
  if (!user) {
    return createHttpResponse({
      status: 401,
      message: 'Unauthorized'
    })
  }

  const feedbacks = await useDrizzle()
    .select({
      id: tables.appFeedback.id,
      title: tables.appFeedback.title,
      message: tables.appFeedback.message,
      userId: tables.appFeedback.userId,
      createdAt: tables.appFeedback.createdAt,
      user: {
        id: tables.user.id,
        name: tables.user.name,
        email: tables.user.email,
        avatar: tables.user.avatar,
        createdAt: tables.user.createdAt,
        // Ajoutez d'autres champs si nécessaire
      },
      starsCount: sql<number>`COUNT(${tables.star.id})`.as('starsCount'),
      hasStarred: sql<boolean>`
        EXISTS (
          SELECT 1
          FROM ${tables.star}
          WHERE ${tables.star.likeableId} = ${tables.appFeedback.id}
            AND ${tables.star.likeableType} = 'appFeedback'
            AND ${tables.star.userId} = ${user.id}
        )
      `.as('hasStarred'),
    })
    .from(tables.appFeedback)
    .leftJoin(
      tables.user,
      eq(tables.appFeedback.userId, tables.user.id)
    )
    .leftJoin(
      tables.star,
      and(
        eq(tables.star.likeableId, tables.appFeedback.id),
        eq(tables.star.likeableType, 'appFeedback')
      )
    )
    .groupBy(
      tables.appFeedback.id,
      tables.appFeedback.title,
      tables.appFeedback.message,
      tables.appFeedback.userId,
      tables.appFeedback.createdAt,
      tables.user.id,
      tables.user.name,
      tables.user.email,
      tables.user.avatar,
      tables.user.createdAt
    )
    .orderBy(desc(sql`starsCount`))

  return createHttpResponse({
    status: 200,
    message: 'Feedbacks Found',
    data: feedbacks
  })
})