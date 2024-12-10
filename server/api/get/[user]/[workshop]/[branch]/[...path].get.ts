import { eq, and, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { user: username, workshop: workshopName, branch: branchName, path } = getRouterParams(event)
  const pathSegments = Array.isArray(path) ? path : (path ? [path] : [])

  const { user: currentUser } = await getUserSession(event)
  const db = useDrizzle()

  // Récupérer le workshop et l'utilisateur
  const [data] = await db.select()
    .from(tables.workshop)
    .leftJoin(tables.user, eq(tables.workshop.ownerId, tables.user.id))
    .where(eq(tables.workshop.name, workshopName))
    .limit(1)
    .execute()

  if(!data || !data.user || !data.workshop) {
      return createHttpResponse({
          message: 'Not Found',
          status: 404
      })
  }

  const workshop = data.workshop
  const user = data.user

  // Vérifier la visibilité
  if (
      workshop.visibility !== 'public' &&
      String((currentUser as User)?.id) !== String(workshop.ownerId)
  ) {
      return createHttpResponse({
          message: 'Not Found',
          status: 404
      })
  }

  // Récupérer la branche
  const [branch] = await db.select().from(tables.branch).where(and(
      eq(tables.branch.name, branchName),
      eq(tables.branch.workshopId, workshop.id)
  )).limit(1).execute()

  if(!branch?.id) {
      return createHttpResponse({
          message: 'Branch Not Found',
          status: 404
      })
  }

  // Récupérer tous les dossiers et fichiers de la branche
  const folders = await db.select()
    .from(tables.folder)
    .where(eq(tables.folder.branchId, branch.id))
    .execute()

  const files = await db.select()
    .from(tables.file)
    .where(eq(tables.file.branchId, branch.id))
    .execute()

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

  const fullTree = buildTree(folders, files)

  // On vérifie s'il existe un dossier 'root' à la racine
  const rootFolderNode = fullTree.find(node => node.type === 'folder' && node.name === 'root')

  // [...path].get.ts
function findFolderInTree(fullTree: any[], segments: string[]): any | null {
  // Si pas de segments, on retourne rootFolderNode si existe, sinon une racine virtuelle
  if (segments.length === 0) {
    if (rootFolderNode) {
      return rootFolderNode
    } else {
      return { type: 'folder', id: 0, name: 'virtual_root', children: fullTree }
    }
  }

  // On commence par trouver le dossier root
  let currentFolder = rootFolderNode || { type: 'folder', id: 0, name: 'virtual_root', children: fullTree }
  let currentChildren = rootFolderNode ? rootFolderNode.children : fullTree

  // On parcourt chaque segment du chemin
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const nextFolder = currentChildren.find(
      (node: any) => node.type === 'folder' && node.name === segment
    )

    if (!nextFolder) {
      return null
    }

    currentFolder = nextFolder
    currentChildren = nextFolder.children
  }

  return currentFolder
}

  const currentFolderNode = findFolderInTree(fullTree, pathSegments)

  if(!currentFolderNode) {
    return createHttpResponse({
      message: 'Folder Not Found',
      status: 404
    })
  }

  return createHttpResponse({
      status: 200,
      message: 'Folder Found',
      data: { ...workshop, branch, tree: currentFolderNode.children ?? [] }
  })
})
