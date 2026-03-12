import { prisma } from "../config/db.js";
import { deleteFromS3 } from "../utils/deleteFromS3.js";

async function migrateImageOrdering() {
  console.log("🚀 Starting image ordering migration...");

  try {
    await prisma.$transaction(async (tx) => {
      console.log(
        "📦 Step 1: Updating ProductImage records with proper ordering..."
      );

      // Get all products and their images
      const products = await tx.product.findMany({
        include: {
          images: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      for (const product of products) {
        if (product.images.length > 0) {
          console.log(
            `📸 Processing ${product.images.length} images for product: ${product.name}`
          );

          // Check for duplicate primary images and fix
          const primaryImages = product.images.filter((img) => img.isPrimary);
          if (primaryImages.length > 1) {
            console.log(
              `⚠️  Found ${primaryImages.length} primary images for product ${product.name}, fixing...`
            );

            // Set all to not primary first
            await tx.productImage.updateMany({
              where: { productId: product.id },
              data: { isPrimary: false },
            });

            // Set the first one as primary
            await tx.productImage.update({
              where: { id: product.images[0].id },
              data: { isPrimary: true },
            });
          }

          // Update order values
          for (let i = 0; i < product.images.length; i++) {
            const image = product.images[i];
            await tx.productImage.update({
              where: { id: image.id },
              data: {
                order: i,
                // Ensure first image is primary if no primary exists
                isPrimary:
                  i === 0 && primaryImages.length === 0
                    ? true
                    : image.isPrimary,
              },
            });
          }
        }
      }

      console.log(
        "📦 Step 2: Updating ProductVariantImage records with proper ordering..."
      );

      // Get all variants and their images
      const variants = await tx.productVariant.findMany({
        include: {
          images: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      for (const variant of variants) {
        if (variant.images.length > 0) {
          console.log(
            `📸 Processing ${variant.images.length} images for variant: ${variant.sku}`
          );

          // Check for duplicate primary images and fix
          const primaryImages = variant.images.filter((img) => img.isPrimary);
          if (primaryImages.length > 1) {
            console.log(
              `⚠️  Found ${primaryImages.length} primary images for variant ${variant.sku}, fixing...`
            );

            // Set all to not primary first
            await tx.productVariantImage.updateMany({
              where: { variantId: variant.id },
              data: { isPrimary: false },
            });

            // Set the first one as primary
            await tx.productVariantImage.update({
              where: { id: variant.images[0].id },
              data: { isPrimary: true },
            });
          }

          // Update order values
          for (let i = 0; i < variant.images.length; i++) {
            const image = variant.images[i];
            await tx.productVariantImage.update({
              where: { id: image.id },
              data: {
                order: i,
                // Ensure first image is primary if no primary exists
                isPrimary:
                  i === 0 && primaryImages.length === 0
                    ? true
                    : image.isPrimary,
              },
            });
          }
        }
      }

      console.log("🧹 Step 3: Cleaning up orphaned images...");

      // Find orphaned product images (images with invalid S3 URLs or products that don't exist)
      const allProductImages = await tx.productImage.findMany({
        include: { product: true },
      });

      for (const image of allProductImages) {
        if (!image.product) {
          console.log(`🗑️  Removing orphaned product image: ${image.url}`);

          try {
            await deleteFromS3(image.url);
          } catch (error) {
            console.error(`Failed to delete from S3: ${image.url}`, error);
          }

          await tx.productImage.delete({
            where: { id: image.id },
          });
        }
      }

      // Find orphaned variant images
      const allVariantImages = await tx.productVariantImage.findMany({
        include: { variant: true },
      });

      for (const image of allVariantImages) {
        if (!image.variant) {
          console.log(`🗑️  Removing orphaned variant image: ${image.url}`);

          try {
            await deleteFromS3(image.url);
          } catch (error) {
            console.error(`Failed to delete from S3: ${image.url}`, error);
          }

          await tx.productVariantImage.delete({
            where: { id: image.id },
          });
        }
      }

      console.log("🔍 Step 4: Validating image integrity...");

      // Ensure every product and variant has at least one primary image if they have images
      const productsWithImages = await tx.product.findMany({
        include: {
          images: true,
        },
        where: {
          images: {
            some: {},
          },
        },
      });

      for (const product of productsWithImages) {
        const primaryImage = product.images.find((img) => img.isPrimary);
        if (!primaryImage && product.images.length > 0) {
          console.log(`🔧 Setting primary image for product: ${product.name}`);
          await tx.productImage.update({
            where: { id: product.images[0].id },
            data: { isPrimary: true },
          });
        }
      }

      const variantsWithImages = await tx.productVariant.findMany({
        include: {
          images: true,
        },
        where: {
          images: {
            some: {},
          },
        },
      });

      for (const variant of variantsWithImages) {
        const primaryImage = variant.images.find((img) => img.isPrimary);
        if (!primaryImage && variant.images.length > 0) {
          console.log(`🔧 Setting primary image for variant: ${variant.sku}`);
          await tx.productVariantImage.update({
            where: { id: variant.images[0].id },
            data: { isPrimary: true },
          });
        }
      }
    });

    console.log("✅ Image ordering migration completed successfully!");

    // Final validation
    console.log("📊 Final validation...");

    const totalProducts = await prisma.product.count();
    const totalProductImages = await prisma.productImage.count();
    const totalVariants = await prisma.productVariant.count();
    const totalVariantImages = await prisma.productVariantImage.count();

    console.log(`📈 Statistics:`);
    console.log(`   - Products: ${totalProducts}`);
    console.log(`   - Product Images: ${totalProductImages}`);
    console.log(`   - Variants: ${totalVariants}`);
    console.log(`   - Variant Images: ${totalVariantImages}`);

    // Check for issues
    const productsWithMultiplePrimary = await prisma.product.findMany({
      include: {
        images: {
          where: { isPrimary: true },
        },
      },
      where: {
        images: {
          some: { isPrimary: true },
        },
      },
    });

    const problematicProducts = productsWithMultiplePrimary.filter(
      (p) => p.images.length > 1
    );
    if (problematicProducts.length > 0) {
      console.log(
        `⚠️  Warning: ${problematicProducts.length} products still have multiple primary images`
      );
    }

    const variantsWithMultiplePrimary = await prisma.productVariant.findMany({
      include: {
        images: {
          where: { isPrimary: true },
        },
      },
      where: {
        images: {
          some: { isPrimary: true },
        },
      },
    });

    const problematicVariants = variantsWithMultiplePrimary.filter(
      (v) => v.images.length > 1
    );
    if (problematicVariants.length > 0) {
      console.log(
        `⚠️  Warning: ${problematicVariants.length} variants still have multiple primary images`
      );
    }

    if (problematicProducts.length === 0 && problematicVariants.length === 0) {
      console.log("🎉 All image integrity checks passed!");
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateImageOrdering()
    .then(() => {
      console.log("🎯 Migration completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Migration failed:", error);
      process.exit(1);
    });
}

export { migrateImageOrdering };
