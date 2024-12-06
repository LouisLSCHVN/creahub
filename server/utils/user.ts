export const sanitizeUser = (user: User) => {
    delete (user as { password?: string }).password;
    return user
}