import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'

export const user = sqliteTable('user', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  avatar: text('avatar').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
  nameIdx: index('name_idx').on(table.name)
}));

export const workshop = sqliteTable('workshop', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ownerId: integer('owner_id')
    .references(() => user.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  description: text('description'),
  visibility: text('visibility').$type<'public' | 'private'>().notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  nameIdx: index('workshop_name_idx').on(table.name),
  descriptionIdx: index('workshop_desc_idx').on(table.description),
  ownerIdx: index('workshop_owner_idx').on(table.ownerId)
}));

export const branch = sqliteTable('branch', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workshopId: integer('workshop_id')
    .references(() => workshop.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const folder = sqliteTable('folder', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .references(() => user.id, { onDelete: 'cascade' })
    .notNull(),
  branchId: integer('branch_id')
    .references(() => branch.id, { onDelete: 'cascade' })
    .notNull(),
  parentFolderId: integer('parent_folder_id').default(0),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon').notNull().default('i-heroicons-folder'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  userIdx: index('folder_user_idx').on(table.userId),
  branchIdx: index('folder_branch_idx').on(table.branchId),
  parentFolderIdx: index('folder_parent_folder_idx').on(table.parentFolderId)
}));

export const file = sqliteTable('file', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workshopId: integer('workshop_id')
    .references(() => workshop.id, { onDelete: 'cascade' })
    .notNull(),
  branchId: integer('branch_id').references(() => branch.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  path: text('path').notNull(),
  folderId: integer('folder_id')
  .references(() => folder.id, { onDelete: 'cascade' })
  .notNull(),
  fileType: text('file_type').$type<'image' | 'video' | 'link'>().notNull(),
  size: integer('size').notNull(),
  version: integer('version').notNull().default(1),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  nameIdx: index('file_name_idx').on(table.name),
  workshopIdx: index('file_workshop_idx').on(table.workshopId)
}));

export const appFeedback = sqliteTable('appFeedback', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .references(() => user.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export type LikeableType = 'workshop' | 'appFeedbacks'
export const star = sqliteTable('star', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .references(() => user.id, { onDelete: 'cascade' })
    .notNull(),
  likeableId: integer('likeable_id').notNull(),
  likeableType: text('likeable_type').$type<LikeableType>().notNull(),
})

export const tag = sqliteTable('tag', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  taggableId: integer('taggable_id').notNull(),
  taggableType: text('taggable_type').$type<'workshop' | 'folder'>().notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});