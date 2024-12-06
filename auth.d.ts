import { User as drizzleUser } from '~~/server/utils/drizzle';

declare module '#auth-utils' {
  interface User extends drizzleUser {}
}

export {};