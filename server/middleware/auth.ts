// server/middleware/auth.ts
export default defineEventHandler(async (event) => {
    const publicRoutes = [
        '/api/get/',
        '/api/user/login',
        '/api/user/signup',
        '/api/search/',
        '/api/_hub/'
    ]

    const path = getRequestURL(event).pathname

    const isPublicRoute = publicRoutes.some(route => path.startsWith(route))

    if (!isPublicRoute) {
        try {
            const session = await getUserSession(event)
            if (!session) {
                return createHttpResponse({
                    status: 401,
                    message: 'Unauthorized'
                })
            }
            event.context.user = session.user
        } catch (error) {
            return createHttpResponse({
                status: 500,
                message: 'Internal server error'
            })
        }
    }
})