import { z } from "@hono/zod-openapi";
import { CategoryModelSchema } from "../../generated/zod/schemas";

export const CategorySchema = CategoryModelSchema.omit({
  products: true,
}).extend({
  name: z.string().min(1).max(50).openapi({ example: "Arabica" }),
  slug: z.string().min(1).max(60).openapi({ example: "arabica" }),
}).openapi("Category");

export const CategoriesSchema = z.array(CategorySchema).openapi("Categories");

export const CreateCategorySchema = z
  .object({
    name: z.string().min(1).max(50).openapi({ example: "Excelsa" }),
  })
  .openapi("CreateCategory");

export const SeedCategorySchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().min(1).max(60),
});

export const SeedCategoriesSchema = z.array(SeedCategorySchema);

export type Category = z.infer<typeof CategorySchema>;
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type SeedCategory = z.infer<typeof SeedCategorySchema>;
export type SeedCategories = z.infer<typeof SeedCategoriesSchema>;
