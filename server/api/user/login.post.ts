import { eq } from 'drizzle-orm';
import { createHttpResponse } from '~~/server/utils/http';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  if (!body || !body.email || !body.password) {
    throw createHttpResponse({
      status: 400,
      message: 'Invalid user data',
    });
  }

  const { email, password } = body;

  const [user] = await useDrizzle()
    .select()
    .from(tables.user)
    .where(eq(tables.user.email, email))
    .limit(1)
    .execute();

  if (!user) {
    throw createHttpResponse({
      status: 404,
      message: 'User not found',
    });
  }

  const isPasswordValid = password === decrypt(user.password!);
  if (!isPasswordValid) {
    throw createHttpResponse({
      status: 401,
      message: 'Invalid credentials',
    });
  }

  const { password: _, ...userWithoutPassword } = user;
  await setUserSession(event, {user});

  return createHttpResponse({
    status: 200,
    data: userWithoutPassword,
    message: 'Login successful',
  });
});