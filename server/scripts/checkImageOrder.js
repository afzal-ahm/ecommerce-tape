import { prisma } from "../config/db.js";

async function checkImageOrder() {
  console.log("🔍 Checking image ordering...");

  try {
    // Check variant images
    const variants = await prisma.productVariant.findMany({
      include: {
        images: {
          orderBy: { order: "asc" },
        },
      },
    });

    console.log(`\n📊 Found ${variants.length} variants:`);

    for (const variant of variants) {
      console.log(`\n🔧 Variant: ${variant.sku}`);
      if (variant.images.length === 0) {
        console.log("  No images");
        continue;
      }

      variant.images.forEach((img, index) => {
        const status = img.isPrimary ? "🔑 PRIMARY" : "📎";
        console.log(
          `  ${status} Order: ${img.order
          }, Expected: ${index}, ID: ${img.id.substring(0, 8)}...`
        );
      });

      // Check for issues
      const primaryCount = variant.images.filter((img) => img.isPrimary).length;
      const orderIssues = variant.images.some(
        (img, index) => img.order !== index
      );

      if (primaryCount !== 1) {
        console.log(`  ❌ Issue: ${primaryCount} primary images (should be 1)`);
      }
      if (orderIssues) {
        console.log(`  ❌ Issue: Order values are not sequential`);
      }
      if (primaryCount === 1 && !orderIssues) {
        console.log(`  ✅ All good!`);
      }
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkImageOrder();
