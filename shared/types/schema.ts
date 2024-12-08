export type User = typeof tables.user.$inferSelect
export type Workshop = typeof tables.workshop.$inferSelect
export type Branch = typeof tables.branch.$inferSelect
export type File = typeof tables.file.$inferSelect
export type Folder = typeof tables.folder.$inferSelect
export type appFeedback = typeof tables.appFeedback.$inferSelect

export type InsertUser = typeof tables.user.$inferInsert
export type InsertWorkshop = typeof tables.workshop.$inferInsert
export type InsertBranch = typeof tables.branch.$inferInsert
export type InsertFile = typeof tables.file.$inferInsert
export type InsertFolder = typeof tables.folder.$inferInsert
export type InsertappFeedback = typeof tables.appFeedback.$inferInsert