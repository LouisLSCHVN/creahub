export default defineEventHandler(async (event) => {
    const { user: username, workshop: workshopName, branch: branchName } = getRouterParams(event)
    const { user: currentUser } = await getUserSession(event)
    const db = useDrizzle()

    // Vérifier l'utilisateur
    const [user] = await db.select()
        .from(tables.user)
        .where(eq(tables.user.name, username))

    if (!user) {
        return createHttpResponse({
            message: 'Utilisateur non trouvé',
            status: 404
        })
    }

    // Récupérer le workshop avec ses branches
    const workshopWithBranches = await db
        .select({
            workshop: tables.workshop,
            branch: tables.branch
        })
        .from(tables.workshop)
        .leftJoin(tables.branch, eq(tables.workshop.id, tables.branch.workshopId))
        .where(eq(tables.workshop.name, workshopName));

    if (!workshopWithBranches.length) {
        return createHttpResponse({
            message: 'Workshop non trouvé',
            status: 404
        })
    }

    // Restructurer les données du workshop
    const workshop = workshopWithBranches[0].workshop;
    const branches = workshopWithBranches.map(row => row.branch).filter(Boolean);

    // Vérifier les permissions
    if (workshop.visibility !== 'public' && String(currentUser?.id) !== String(workshop.ownerId)) {
        return createHttpResponse({
            message: 'Non trouvé',
            status: 404
        })
    }

    // Trouver la branche demandée
    const currentBranch = branches.find(b => b.name === branchName);
    if (!currentBranch) {
        return createHttpResponse({
            message: 'Branche non trouvée',
            status: 404
        })
    }

    // Récupérer tous les dossiers de la branche
    const folders = await db
        .select()
        .from(tables.folder)
        .where(eq(tables.folder.branchId, currentBranch.id))

    // Récupérer tous les fichiers de la branche
    const files = await db
        .select({
            id: tables.file.id,
            name: tables.file.name,
            folderId: tables.file.folderId,
            folder: tables.folder
        })
        .from(tables.file)
        .leftJoin(
            tables.folder,
            eq(tables.file.folderId, tables.folder.id)
        )
        .where(eq(tables.file.branchId, currentBranch.id));

    // Fonction pour construire l'arborescence
    const buildTree = (items: any[], parentId: number | null = null): any[] => {
        return items
            .filter(item => item.parentFolderId === parentId)
            .map(item => ({
                ...item,
                children: buildTree(items, item.id)
            }))
    }

    // Construire l'arborescence des dossiers
    const folderTree = buildTree(folders);

    // Ajouter les fichiers à leurs dossiers respectifs
    const addFilesToFolders = (folders: any[]): any[] => {
        return folders.map(folder => ({
            ...folder,
            files: files
                .filter(file => file.folderId === folder.id)
                .map(file => ({
                    id: file.id,
                    name: file.name,
                    type: file.type,
                    content: file.content,
                    folderId: file.folderId,
                    branchId: file.branchId
                })),
            children: addFilesToFolders(folder.children)
        }))
    }

    const completeTree = addFilesToFolders(folderTree);

    // Ajouter les fichiers qui sont à la racine (sans dossier parent)
    const rootFiles = files
        .filter(file => !file.folderId)
        .map(file => ({
            id: file.id,
            name: file.name,
            type: file.type,
            content: file.content,
            branchId: file.branchId
        }));

    return createHttpResponse({
        status: 200,
        message: 'Workshop trouvé',
        data: {
            ...workshop,
            branches,
            currentBranch: {
                ...currentBranch,
                tree: completeTree,
                rootFiles
            }
        }
    })
})