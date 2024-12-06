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

  const feedback = await useDrizzle().select().from(tables.appFeedback).where(eq(tables.appFeedback.id, id))

  if (feedback.length === 0) {
    return createHttpResponse({
      status: 404,
      message: 'Feedback not found'
    })
  }

  if (feedback[0].userId !== user.id) {
    return createHttpResponse({
      status: 403,
      message: 'Forbidden'
    })
  }

  const result = await useDrizzle().delete(tables.appFeedback).where(eq(tables.appFeedback.id, id))

  if (result.error) {
    return createHttpResponse({
      status: 500,
      message: 'Failed to delete feedback'
    })
  }

  return createHttpResponse({ status: 204 })
})
