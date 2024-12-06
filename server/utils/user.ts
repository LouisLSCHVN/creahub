export const sanitizeUser = (user: User) => {
    (user as { password?: string }).password = undefined;
    return user
}