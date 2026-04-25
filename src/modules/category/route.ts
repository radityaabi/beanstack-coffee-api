import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import { prisma } from "../../lib/prisma";
import { createSlug } from "../common/utils";
import {
  CategorySchema,
  CategoriesSchema,
  CreateCategorySchema,
} from "./schema-type";

export const categoryRoute = new OpenAPIHono();

const tags = ["Categories"];

// ─── GET /categories ── List all categories ───
const getCategoriesRoute = createRoute({
  method: "get",
  path: "/",
  tags,
  summary: "Get all categories",
  responses: {
    200: {
      description: "List of all categories",
      content: { "application/json": { schema: CategoriesSchema } },
    },
  },
});

categoryRoute.openapi(getCategoriesRoute, async (c) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  return c.json(categories, 200);
});

// ─── POST /categories ── Create new category ───
const createCategoryRoute = createRoute({
  method: "post",
  path: "/",
  tags,
  summary: "Create a new category",
  request: {
    body: {
      content: { "application/json": { schema: CreateCategorySchema } },
    },
  },
  responses: {
    201: {
      description: "Category created successfully",
      content: { "application/json": { schema: CategorySchema } },
    },
    409: { description: "Category already exists" },
  },
});

categoryRoute.openapi(createCategoryRoute, async (c) => {
  const payload = c.req.valid("json");
  const slug = createSlug(payload.name);

  try {
    const category = await prisma.category.create({
      data: { name: payload.name, slug },
    });

    return c.json(category, 201);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return c.json({ error: "Category already exists" }, 409);
    }
    throw error;
  }
});

// ─── DELETE /categories/:id ── Delete a category ───
const deleteCategoryRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags,
  summary: "Delete a category",
  request: {
    params: z.object({
      id: z.string().min(1).openapi({ example: "01JMXYZ..." }),
    }),
  },
  responses: {
    200: { description: "Category deleted successfully" },
    404: { description: "Category not found" },
    409: { description: "Category is in use by products" },
  },
});

categoryRoute.openapi(deleteCategoryRoute, async (c) => {
  const { id } = c.req.valid("param");

  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });

  if (!category) {
    return c.json({ error: "Category not found" }, 404);
  }

  if (category._count.products > 0) {
    return c.json(
      {
        error: `Cannot delete category "${category.name}". It is used by ${category._count.products} product(s).`,
      },
      409,
    );
  }

  await prisma.category.delete({ where: { id } });

  return c.json({ message: "Category deleted successfully" }, 200);
});
