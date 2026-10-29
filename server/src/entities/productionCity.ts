import { z } from 'zod';
import { ProductionCitySchema as PublicProductionCitySchema } from '@sugarcube/schema';

export const ProductionCitySchema = PublicProductionCitySchema.extend({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
});

export type ProductionCity = z.infer<typeof ProductionCitySchema>;

type Expect<T extends true> = T;
type _productionCityIsPublicSubset = Expect<
    ProductionCity extends z.infer<typeof PublicProductionCitySchema> ? true : never
>;
