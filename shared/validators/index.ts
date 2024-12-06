import type { SQLiteColumn } from "drizzle-orm/sqlite-core";

export const isValueTaken = async (name: string, type: SQLiteColumn<any>): Promise<boolean> => {
    const drizzle = useDrizzle();
    const [user] = await drizzle
      .select()
      .from(tables.user)
      .where(eq(type, name));
    return !!user;
  };