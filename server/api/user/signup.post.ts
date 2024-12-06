import { createHttpResponse } from '~~/server/utils/http';
import { createUserValidator } from '~~/shared/validators/user';

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(
    event,
    createUserValidator.safeParseAsync
  );
  if (!body.success) {
    return createValidationError(body.error);
  }

  body.data.password = encrypt(body.data.password);

  const newUser = {
    ...body.data,
    avatar: '',
    createdAt: new Date(),
  };
  const result = await useDrizzle().insert(tables.user).values(newUser).execute();
  console.log(result)

  if (!result || !result.success) {
    throw createHttpResponse({
      status: 500,
      message: 'User not created',
    });
  }

  const insertedId = result.meta.last_row_id;
  const [user] = await useDrizzle()
    .select()
    .from(tables.user)
    .where(eq(tables.user.id, insertedId))
    .limit(1)
    .execute();

  if (!user) {
    throw createHttpResponse({
      status: 500,
      message: 'User created but not found',
    });
  }

  await setUserSession(event, {user})

  return { message: 'User created', user: sanitizeUser(user) };
});