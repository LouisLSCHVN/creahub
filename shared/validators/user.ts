import { z } from 'zod';

export const createUserValidator = z.object({
  name: z
    .string()
    .min(1, { message: 'Name is required' })
    .max(256)
    .refine((value) => value.length <= 256, { message: 'Max length is 256' }),
  email: z.string().email({ message: 'Invalid email' }),
  password: z
    .string()
    .min(8)
    .max(256)
    .refine((value) => value.length <= 256, { message: 'Max length is 256' }),
});

export const changePasswordValidator = z
  .object({
    currentPassword: z.string().nonempty('Le mot de passe actuel est requis'),
    newPassword: z
      .string()
      .nonempty('Le nouveau mot de passe est requis')
      .min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
    confirmNewPassword: z
      .string()
      .nonempty('Veuillez confirmer le nouveau mot de passe'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmNewPassword'],
  });