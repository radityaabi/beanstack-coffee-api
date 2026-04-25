import { prisma } from "../src/lib/prisma";
import { createSlug } from "../src/modules/common/utils";
import { categories, products } from "./data";

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Upsert categories first
  console.log("\n📂 Seeding categories...");
  for (const category of categories) {
    const result = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: { name: category.name, slug: category.slug },
    });
    console.log(` 📁 ${result.name} (${result.slug})`);
  }

  // 2. Build a slug→id lookup map
  const allCategories = await prisma.category.findMany();
  const categoryMap = new Map(
    allCategories.map((category) => [category.slug, category.id]),
  );

  // 3. Upsert products using categoryId
  console.log("\n☕ Seeding products...");
  for (const product of products) {
    const categoryId = categoryMap.get(product.categorySlug);
    if (!categoryId) {
      console.error(
        ` ❌ Category "${product.categorySlug}" not found for ${product.name}`,
      );
      continue;
    }

    const slug = createSlug(product.name);
    const { categorySlug, ...productData } = product;

    const result = await prisma.product.upsert({
      where: { sku: product.sku },
      update: {
        ...productData,
        slug,
        categoryId,
      },
      create: {
        ...productData,
        slug,
        categoryId,
      },
    });
    console.log(` 🫘  ${result.name} (${result.sku})`);
  }

  console.log(
    `\n🎉 Seeded ${categories.length} categories and ${products.length} products successfully!`,
  );
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
