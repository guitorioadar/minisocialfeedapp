import { z } from 'zod';

export const createPostSchema = z.object({
  body: z.object({
    content: z.string().min(1).max(500),
  }),
});

export const getPostsSchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => val ? parseInt(val, 10) : 1),
    limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 20),
    username: z.string().optional(),
  }),
});
