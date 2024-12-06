import { z } from 'zod';
import { isValueTaken } from '.';

export const createWorkshopValidator = z.object({
  name: z
    .string()
    .min(1, { message: 'Workshop name is required' })
    .max(256, { message: 'Workshop name must be less than 256 characters' }),
  description: z
    .string()
    .max(1000, { message: 'Description must be less than 1000 characters' })
    .optional(),

  visibility: z.enum(['public', 'private'], {
    message: 'Need to be either public or private'
  })
});

// Type inference
export type CreateWorkshopInput = z.infer<typeof createWorkshopValidator>;