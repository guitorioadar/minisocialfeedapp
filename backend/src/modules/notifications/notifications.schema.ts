import { z } from 'zod';

export const registerTokenSchema = z.object({
  body: z.object({
    token: z.string().min(1),
  }),
});
