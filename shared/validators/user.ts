import { z } from 'zod';
import { isValueTaken } from '.';

const nameToAvoid = [
  'settings',
  'setting',
  'new',
  'discover',
  'search',
  'signup',
  'login',
  'feedback',
  'legals',
  'blog',
  'home',
  'about',
  'contact',
  'profile',
  'admin',
  'dashboard',
  'repository',
  'repo',
  'issues',
  'pulls',
  'pullrequests',
  'actions',
  'projects',
  'wiki',
  'security',
  'insights',
  'marketplace',
  'explore',
  'notifications',
  'stars',
  'forks',
  'commits',
  'branches',
  'branch',
  'tags',
  'releases',
  'contributors',
  'code',
  'compare',
  'milestones',
  'labels',
  'discussions'
];

export const createUserValidator = z.object({
  name: z
    .string()
    .min(1, { message: 'Name is required' })
    .max(256)
    .refine((value) => value.length <= 256, { message: 'Max length is 256' })
    .refine(async (value) => !(await isValueTaken(value, tables.user.name)), { message: 'Username is already taken' })
    .refine((value) => !nameToAvoid.includes(value.toLowerCase()), { message: 'This name is not allowed' }),
  email: z.string().email({ message: 'Invalid email' }),
  password: z
    .string()
    .min(8)
    .max(256)
    .refine((value) => value.length <= 256, { message: 'Max length is 256' }),
});

export const changePasswordValidator = z
  .object({
    currentPassword: z.string().min(1, 'Le mot de passe actuel est requis'),
    newPassword: z
      .string()
      .min(1, 'Le nouveau mot de passe est requis')
      .min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
    confirmNewPassword: z
      .string()
      .min(1, 'Veuillez confirmer le nouveau mot de passe'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmNewPassword'],
  });