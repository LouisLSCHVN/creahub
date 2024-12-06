import { drizzle } from 'drizzle-orm/d1'
export { sql, eq, and, or } from 'drizzle-orm'

import * as schema from '../database/schema'

export const tables = schema

export function useDrizzle() {
  return drizzle(hubDatabase(), { schema })
}

export type User = typeof schema.user.$inferSelect
export type Workshop = typeof schema.workshop.$inferSelect
export type File = typeof schema.file.$inferSelect
export type appFeedback = typeof schema.appFeedback.$inferSelect