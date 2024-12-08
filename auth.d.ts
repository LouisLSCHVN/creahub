import { User } from '~~/shared/types/schema';

declare module '#auth-utils' {
  interface User extends User {}
}

export {};