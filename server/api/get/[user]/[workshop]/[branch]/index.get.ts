export default defineEventHandler(async (event) => {
    const { user: username, workshop: workshopName, branch: branchName } = getRouterParams(event)
    const { user: currentUser } = await getUserSession(event)
    const db = useDrizzle()

    const [data] = await db.select()
        .from(tables.workshop)
        .leftJoin(tables.user, eq(tables.workshop.ownerId, tables.user.id))
        .where(eq(tables.workshop.name, workshopName))
        .limit(1)
        .execute()

        if(!data) {
            return createHttpResponse({
                message: 'Not Found',
                status: 404
            })
        }


    if(!data.user) {
        return createHttpResponse({
            message: 'Workshop Not Found',
            status: 404
        })
    }
    if(!data.workshop) {
        return createHttpResponse({
            message: 'Workshop Not Found',
            status: 404
        })
    }

    const workshop = data.workshop
    const user = data.user

    // if workshop is private, check if user is owner
    if (
        workshop.visibility !== 'public' &&
        String((currentUser as User)?.id) !== String(workshop.ownerId)
    ) {
            return createHttpResponse({
                message: 'Not Found',
                status: 404
            })
        }

    const [branch] = await db.select().from(tables.branch).where(and(
        eq(tables.branch.name, branchName),
        eq(tables.branch.workshopId, workshop.id)
    )).limit(1).execute()

    if(!branch.id) {
        return createHttpResponse({
            message: 'Branch Not Found',
            status: 404
        })
    }

    function buildTree(folders: any[], files: any[], parentId: number = 0): any[] {
        return folders
            .filter(folder => folder.parentFolderId === parentId)
            .map(folder => ({
                ...folder,
                type: 'folder',
                children: [
                    ...buildTree(folders, files, folder.id),
                    ...files
                        .filter(file => file.folderId === folder.id)
                        .map(file => ({
                            ...file,
                            type: 'file'
                        }))
                ]
            }))
    }

    const folders = await db.select()
    .from(tables.folder)
    .where(eq(tables.folder.branchId, branch.id))
    .execute()

    const files = await db.select()
        .from(tables.file)
        .where(eq(tables.file.branchId, branch.id))
        .execute()

    const tree = buildTree(folders, files)

    return createHttpResponse({
        status: 200,
        message: 'Branch Found',
        data: { ...workshop, branch, tree }
    })
})