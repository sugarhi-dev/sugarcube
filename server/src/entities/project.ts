import { z } from 'zod';
import { ProjectSchema as PublicProjectSchema } from '@sugarcube/schema';

export const ProjectSchema = PublicProjectSchema.extend({
    user_profile_id: z.ulid(),
});

export type Project = z.infer<typeof ProjectSchema>;

type Expect<T extends true> = T;
type _projectIsPublicSubset = Expect<Project extends z.infer<typeof PublicProjectSchema> ? true : never>;
