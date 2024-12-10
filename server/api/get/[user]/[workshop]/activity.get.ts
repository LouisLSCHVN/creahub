import { eq, sql } from 'drizzle-orm'
export default defineEventHandler(async (event) => {
  const { user: username, workshop: workshopName } = getRouterParams(event)
  const { user: currentUser } = await getUserSession(event)

  const db = useDrizzle()

  // 1. Récupération de l'utilisateur par username
  const [owner] = await db.select().from(tables.user).where(eq(tables.user.name, username))
  if (!owner) {
    return createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  // 2. Récupération du workshop par nom et owner
  const currentWorkshop = await db.select().from(tables.workshop)
    .where(eq(tables.workshop.ownerId, owner.id))
    .where(eq(tables.workshop.name, workshopName))
    .get()

  if (!currentWorkshop) {
    return createError({ statusCode: 404, statusMessage: 'Workshop not found' })
  }

  const workshopId = currentWorkshop.id

  // 3. Calcul des métriques globales
  const totalBranches = await db.select({ count: sql<number>`COUNT(*)` })
    .from(tables.branch)
    .where(eq(tables.branch.workshopId, workshopId))
    .get()

  const totalFiles = await db.select({ count: sql<number>`COUNT(*)` })
    .from(tables.file)
    .where(eq(tables.file.workshopId, workshopId))
    .get()

  const totalSize = await db.select({ size: sql<number>`SUM(${tables.file.size})` })
    .from(tables.file)
    .where(eq(tables.file.workshopId, workshopId))
    .get()

  const totalVersions = totalFiles.count

  // Dernières mises à jour globales
  const lastWorkshopUpdate = currentWorkshop.updatedAt
  const lastBranchUpdate = await db.select({ maxUpdated: sql<number>`MAX(${tables.branch.updatedAt})` })
    .from(tables.branch)
    .where(eq(tables.branch.workshopId, workshopId))
    .get()

  const lastFolderUpdate = await db.select({ maxUpdated: sql<number>`MAX(${tables.folder.updatedAt})` })
    .from(tables.folder)
    .leftJoin(tables.branch, eq(tables.folder.branchId, tables.branch.id))
    .where(eq(tables.branch.workshopId, workshopId))
    .get()

  const lastFileUpdate = await db.select({ maxUpdated: sql<number>`MAX(${tables.file.updatedAt})` })
    .from(tables.file)
    .where(eq(tables.file.workshopId, workshopId))
    .get()

  const updates = [lastWorkshopUpdate, lastBranchUpdate.maxUpdated, lastFolderUpdate.maxUpdated, lastFileUpdate.maxUpdated].filter(Boolean)
  const lastUpdate = updates.length > 0 ? Math.max(...updates) : currentWorkshop.updatedAt

  // Tags du workshop
  const workshopTags = await db.select()
    .from(tables.tag)
    .where(eq(tables.tag.taggableId, workshopId))
    .where(eq(tables.tag.taggableType, 'workshop'))
    .all()

  // 4. Stats par branche
  const branches = await db.select().from(tables.branch)
    .where(eq(tables.branch.workshopId, workshopId))
    .all()

  const branchStats = await Promise.all(branches.map(async (b) => {
    const branchFilesCount = await db.select({ count: sql<number>`COUNT(*)` })
      .from(tables.file)
      .where(eq(tables.file.branchId, b.id))
      .get()

    const branchFileSize = await db.select({ size: sql<number>`SUM(${tables.file.size})` })
      .from(tables.file)
      .where(eq(tables.file.branchId, b.id))
      .get()

    const branchFoldersCount = await db.select({ count: sql<number>`COUNT(*)` })
      .from(tables.folder)
      .where(eq(tables.folder.branchId, b.id))
      .get()

    const lastBranchFolderUpdate = await db.select({ maxUpdated: sql<number>`MAX(${tables.folder.updatedAt})` })
      .from(tables.folder)
      .where(eq(tables.folder.branchId, b.id))
      .get()

    const lastBranchFileUpdate = await db.select({ maxUpdated: sql<number>`MAX(${tables.file.updatedAt})` })
      .from(tables.file)
      .where(eq(tables.file.branchId, b.id))
      .get()

    const branchUpdates = [b.updatedAt, lastBranchFolderUpdate.maxUpdated, lastBranchFileUpdate.maxUpdated].filter(Boolean)
    const branchLastUpdate = branchUpdates.length > 0 ? Math.max(...branchUpdates) : b.updatedAt

    return {
      id: b.id,
      name: b.name,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
      totalFiles: branchFilesCount.count,
      totalSize: branchFileSize.size || 0,
      totalFolders: branchFoldersCount.count,
      lastUpdate: branchLastUpdate
    }
  }))

  // 5. Derniers fichiers ajoutés ou mis à jour (par exemple, les 10 derniers)
  // Tri par updatedAt décroissant
  const recentFiles = await db.select({
    id: tables.file.id,
    name: tables.file.name,
    path: tables.file.path,
    folderId: tables.file.folderId,
    branchId: tables.file.branchId,
    updatedAt: tables.file.updatedAt,
    createdAt: tables.file.createdAt,
  })
  .from(tables.file)
  .where(eq(tables.file.workshopId, workshopId))
  .orderBy(sql`updated_at DESC`) // ou tables.file.updatedAt.desc() si supporté
  .limit(10)
  .all()

  // 6. Journal d’activité (logs)
  // On va combiner les dernières modifications sur branches, dossiers, et fichiers.
  // On récupère, par exemple, les 10 derniers updates de chaque type, et on les merge.

  // Dernières branches modifiées
  const recentBranches = await db.select({
    id: tables.branch.id,
    name: tables.branch.name,
    updatedAt: tables.branch.updatedAt,
    createdAt: tables.branch.createdAt,
  })
  .from(tables.branch)
  .where(eq(tables.branch.workshopId, workshopId))
  .orderBy(sql`updated_at DESC`)
  .limit(10)
  .all()

  // Derniers dossiers modifiés
  const recentFolders = await db.select({
    id: tables.folder.id,
    name: tables.folder.name,
    branchId: tables.folder.branchId,
    updatedAt: tables.folder.updatedAt,
    createdAt: tables.folder.createdAt,
  })
  .from(tables.folder)
  .leftJoin(tables.branch, eq(tables.folder.branchId, tables.branch.id))
  .where(eq(tables.branch.workshopId, workshopId))
  .orderBy(sql`folder.updated_at DESC`)
  .limit(10)
  .all()

  // On a déjà recentFiles.
  // On va créer un tableau unifié recentActivity.
  // Chaque entrée aura un champ type (branch/folder/file), un nom et un updatedAt.
  const activityLogs = [
    ...recentBranches.map(b => ({
      type: 'branch',
      id: b.id,
      name: b.name,
      updatedAt: b.updatedAt,
      createdAt: b.createdAt
    })),
    ...recentFolders.map(f => ({
      type: 'folder',
      id: f.id,
      name: f.name,
      branchId: f.branchId,
      updatedAt: f.updatedAt,
      createdAt: f.createdAt
    })),
    ...recentFiles.map(fi => ({
      type: 'file',
      id: fi.id,
      name: fi.name,
      path: fi.path,
      branchId: fi.branchId,
      folderId: fi.folderId,
      updatedAt: fi.updatedAt,
      createdAt: fi.createdAt
    })),
  ]

  // Trier par updatedAt décroissant
  activityLogs.sort((a, b) => b.updatedAt - a.updatedAt)
  // Limiter par exemple aux 20 derniers événements, ajustez selon besoin
  const recentActivity = activityLogs.slice(0, 20)

  return {
    workshop: {
      id: currentWorkshop.id,
      name: currentWorkshop.name,
      description: currentWorkshop.description,
      ownerId: currentWorkshop.ownerId,
      visibility: currentWorkshop.visibility,
      createdAt: currentWorkshop.createdAt,
      updatedAt: currentWorkshop.updatedAt,

      // Stats globales
      totalBranches: totalBranches.count,
      totalFiles: totalFiles.count,
      totalSize: totalSize.size || 0,
      totalVersions: totalVersions,
      lastUpdate: lastUpdate,
      tags: workshopTags.map(t => ({ id: t.id, name: t.name })),
    },
    branches: branchStats,
    recentFiles,
    recentActivity
  }
})
