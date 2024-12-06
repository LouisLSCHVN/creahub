import { eq, and } from 'drizzle-orm'
import type { LikeableType } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const { user } = await getUserSession(event)
  if (!user) {
    return createHttpResponse({
      status: 401,
      message: 'Unauthorized'
    })
  }

  const type = getRouterParam(event, 'type')
  if (type !== 'workshop' && type !== 'appFeedback') {
    return createHttpResponse({
      status: 400,
      message: 'Invalid type'
    })
  }

  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) {
    return createHttpResponse({
      status: 400,
      message: 'Invalid ID'
    })
  }

  // Vérifier si l'élément à liker existe
  const likeableExists = await useDrizzle().select().from(
    type === 'workshop' ? tables.workshop : tables.appFeedback
  ).where(eq(
    type === 'workshop' ? tables.workshop.id : tables.appFeedback.id,
    id
  ))

  if (likeableExists.length === 0) {
    return createHttpResponse({
      status: 404,
      message: 'Item not found'
    })
  }

  // Vérifier si un like existe déjà
  const existingStar = await useDrizzle()
    .select()
    .from(tables.star)
    .where(
      and(
        eq(tables.star.userId, user.id),
        eq(tables.star.likeableId, id),
        eq(tables.star.likeableType, type as LikeableType)
      )
    )

  if (existingStar.length > 0) {
    // Si le like existe, le supprimer (unlike)
    await useDrizzle()
      .delete(tables.star)
      .where(
        eq(tables.star.id, existingStar[0].id)
      )

    return createHttpResponse({
      status: 200,
      message: 'Unliked successfully'
    })
  } else {
    // Si le like n'existe pas, l'ajouter (like)
    await useDrizzle()
      .insert(tables.star)
      .values({
        userId: user.id,
        likeableId: id,
        likeableType: type as LikeableType
      })

    return createHttpResponse({
      status: 201,
      message: 'Liked successfully'
    })
  }
})