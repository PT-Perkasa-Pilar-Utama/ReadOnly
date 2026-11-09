import { type GenreItem, genreItemSchema } from '@readonly/shared';
import { z } from 'zod';

export { type GenreItem, genreItemSchema };

export const activeGenresResponseSchema = z.object({
  data: z.array(genreItemSchema),
});

export type ActiveGenresResponse = z.infer<typeof activeGenresResponseSchema>;

