import { prisma } from "../config/db.js";

async function fixImageOrdering() {
  console.log("🚀 Starting image ordering fix...");

  try {
    // Get all variants with their images
    const variants = await prisma.productVariant.findMany({
      include: {
        images: {
          orderBy: { createdAt: "asc" }, // Use creation time as base order
        },
      },
    });

    console.log(`📊 Found ${variants.length} variants to process`);

    for (const variant of variants) {
      if (variant.images.length === 0) {
        console.log(`⏭️  Skipping variant ${variant.sku} - no images`);
        continue;
      }

      console.log(
        `🔧 Processing variant ${variant.sku} with ${variant.images.length} images`
      );

      // Step 1: Fix primary image logic - only first image should be primary
      const imagesToUpdate = [];

      for (let i = 0; i < variant.images.length; i++) {
        const image = variant.images[i];
        const shouldBePrimary = i === 0; // Only first image should be primary
        const correctOrder = i; // Sequential ordering

        if (
          image.isPrimary !== shouldBePrimary ||
          image.order !== correctOrder
        ) {
          imagesToUpdate.push({
            id: image.id,
            isPrimary: shouldBePrimary,
            order: correctOrder,
          });
        }
      }

      // Step 2: Apply updates in transaction
      if (imagesToUpdate.length > 0) {
        await prisma.$transaction(async (tx) => {
          for (const update of imagesToUpdate) {
            await tx.productVariantImage.update({
              where: { id: update.id },
              data: {
                isPrimary: update.isPrimary,
                order: update.order,
              },
            });
          }
        });

        console.log(
          `✅ Fixed ${imagesToUpdate.length} images for variant ${variant.sku}`
        );
      } else {
        console.log(`✅ Variant ${variant.sku} is already correctly ordered`);
      }
    }

    // Also fix product images
    const products = await prisma.product.findMany({
      include: {
        images: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    console.log(`📊 Found ${products.length} products to process`);

    for (const product of products) {
      if (product.images.length === 0) {
        console.log(`⏭️  Skipping product ${product.name} - no images`);
        continue;
      }

      console.log(
        `🔧 Processing product ${product.name} with ${product.images.length} images`
      );

      const imagesToUpdate = [];

      for (let i = 0; i < product.images.length; i++) {
        const image = product.images[i];
        const shouldBePrimary = i === 0;
        const correctOrder = i;

        if (
          image.isPrimary !== shouldBePrimary ||
          image.order !== correctOrder
        ) {
          imagesToUpdate.push({
            id: image.id,
            isPrimary: shouldBePrimary,
            order: correctOrder,
          });
        }
      }

      if (imagesToUpdate.length > 0) {
        await prisma.$transaction(async (tx) => {
          for (const update of imagesToUpdate) {
            await tx.productImage.update({
              where: { id: update.id },
              data: {
                isPrimary: update.isPrimary,
                order: update.order,
              },
            });
          }
        });

        console.log(
          `✅ Fixed ${imagesToUpdate.length} images for product ${product.name}`
        );
      } else {
        console.log(`✅ Product ${product.name} is already correctly ordered`);
      }
    }

    // Final verification
    console.log("\n🔍 Final verification...");

    const variantImageStats = await prisma.productVariantImage.groupBy({
      by: ["variantId"],
      _count: {
        _all: true,
      },
      _sum: {
        isPrimary: true,
      },
    });

    let issuesFound = 0;
    for (const stat of variantImageStats) {
      if (stat._sum.isPrimary !== 1) {
        console.log(
          `❌ Variant ${stat.variantId} has ${stat._sum.isPrimary} primary images (should be 1)`
        );
        issuesFound++;
      }
    }

    const productImageStats = await prisma.productImage.groupBy({
      by: ["productId"],
      _count: {
        _all: true,
      },
      _sum: {
        isPrimary: true,
      },
    });

    for (const stat of productImageStats) {
      if (stat._sum.isPrimary !== 1) {
        console.log(
          `❌ Product ${stat.productId} has ${stat._sum.isPrimary} primary images (should be 1)`
        );
        issuesFound++;
      }
    }

    if (issuesFound === 0) {
      console.log(
        "✅ All images are correctly ordered with proper primary image settings!"
      );
    } else {
      console.log(`❌ Found ${issuesFound} issues that need manual attention`);
    }
  } catch (error) {
    console.error("❌ Error fixing image ordering:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixImageOrdering();
