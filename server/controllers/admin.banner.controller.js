import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../config/db.js";
import { deleteFromS3, getFileUrl } from "../utils/deleteFromS3.js";
import { processAndUploadImage } from "../middlewares/multer.middlerware.js";

// Get all banners (admin)
export const getBanners = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 50,
    search = "",
    isPublished,
    isActive,
    sort = "position",
    order = "asc",
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Build filter conditions
  const filterConditions = {
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { subtitle: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(isPublished !== undefined && {
      isPublished: isPublished === "true",
    }),
    ...(isActive !== undefined && {
      isActive: isActive === "true",
    }),
  };

  // Get total count
  const totalBanners = await prisma.banner.count({
    where: filterConditions,
  });

  // Get banners
  const banners = await prisma.banner.findMany({
    where: filterConditions,
    orderBy: [{ [sort]: order }, { createdAt: "desc" }],
    skip,
    take: parseInt(limit),
  });

  // Format response with image URLs
  const formattedBanners = banners.map((banner) => ({
    ...banner,
    desktopImage: banner.desktopImage ? getFileUrl(banner.desktopImage) : null,
    mobileImage: banner.mobileImage ? getFileUrl(banner.mobileImage) : null,
  }));

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        banners: formattedBanners,
        pagination: {
          total: totalBanners,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalBanners / parseInt(limit)),
        },
      },
      "Banners fetched successfully"
    )
  );
});

// Get banner by ID (admin)
export const getBannerById = asyncHandler(async (req, res, next) => {
  const { bannerId } = req.params;

  const banner = await prisma.banner.findUnique({
    where: { id: bannerId },
  });

  if (!banner) {
    throw new ApiError(404, "Banner not found");
  }

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        banner: {
          ...banner,
          desktopImage: banner.desktopImage
            ? getFileUrl(banner.desktopImage)
            : null,
          mobileImage: banner.mobileImage
            ? getFileUrl(banner.mobileImage)
            : null,
        },
      },
      "Banner fetched successfully"
    )
  );
});

// Create banner (admin)
export const createBanner = asyncHandler(async (req, res, next) => {
  const { title, subtitle, link, position, isPublished, isActive } = req.body;

  // Validate required fields
  if (!req.files || !req.files.desktopImage || !req.files.mobileImage) {
    throw new ApiError(400, "Desktop and mobile images are required");
  }

  // Upload images
  let desktopImageUrl, mobileImageUrl;

  try {
    desktopImageUrl = await processAndUploadImage(req.files.desktopImage[0]);
    mobileImageUrl = await processAndUploadImage(req.files.mobileImage[0]);
  } catch (error) {
    // Clean up uploaded images if one fails
    if (desktopImageUrl) {
      await deleteFromS3(desktopImageUrl);
    }
    if (mobileImageUrl) {
      await deleteFromS3(mobileImageUrl);
    }
    throw new ApiError(400, "Failed to upload images: " + error.message);
  }

  // Auto-calculate position if not provided
  let bannerPosition = 0;
  if (position !== undefined && position !== null && position !== "") {
    bannerPosition = parseInt(position) || 0;
  } else {
    // Get the highest position and add 1
    const maxPositionBanner = await prisma.banner.findFirst({
      orderBy: { position: "desc" },
      select: { position: true },
    });
    bannerPosition = maxPositionBanner ? maxPositionBanner.position + 1 : 0;
  }

  // Reorder existing banners if new position conflicts
  // Shift all banners at or after the new position down by 1
  const bannersToShift = await prisma.banner.findMany({
    where: {
      position: {
        gte: bannerPosition,
      },
    },
  });

  // Shift existing banners down
  for (const existingBanner of bannersToShift) {
    await prisma.banner.update({
      where: { id: existingBanner.id },
      data: {
        position: existingBanner.position + 1,
      },
    });
  }

  // Create banner
  const banner = await prisma.banner.create({
    data: {
      title: title || null,
      subtitle: subtitle || null,
      link: link || "/products",
      desktopImage: desktopImageUrl,
      mobileImage: mobileImageUrl,
      position: bannerPosition,
      isPublished: isPublished !== "false" && isPublished !== false, // Default true
      isActive: isActive !== "false" && isActive !== false,
    },
  });

  res.status(201).json(
    new ApiResponsive(
      201,
      {
        banner: {
          ...banner,
          desktopImage: getFileUrl(banner.desktopImage),
          mobileImage: getFileUrl(banner.mobileImage),
        },
      },
      "Banner created successfully"
    )
  );
});

// Update banner (admin)
export const updateBanner = asyncHandler(async (req, res, next) => {
  const { bannerId } = req.params;
  const { title, subtitle, link, position, isPublished, isActive } = req.body;

  // Check if banner exists
  const existingBanner = await prisma.banner.findUnique({
    where: { id: bannerId },
  });

  if (!existingBanner) {
    throw new ApiError(404, "Banner not found");
  }

  // Prepare update data
  const updateData = {};
  let newPosition = null;

  if (title !== undefined) updateData.title = title || null;
  if (subtitle !== undefined) updateData.subtitle = subtitle || null;
  if (link !== undefined) updateData.link = link || "/products";
  if (position !== undefined) {
    newPosition = parseInt(position) || 0;
    updateData.position = newPosition;
  }
  if (isPublished !== undefined)
    updateData.isPublished = isPublished === "true" || isPublished === true;
  if (isActive !== undefined)
    updateData.isActive = isActive !== "false" && isActive !== false;

  // Handle position reordering if position is being changed
  if (newPosition !== null) {
    const oldPosition = existingBanner.position;

    if (newPosition !== oldPosition) {
      // Position is being changed - need to reorder
      if (newPosition < oldPosition) {
        // Moving to earlier position (e.g., from 5 to 1)
        // Shift all banners from newPosition to oldPosition-1 up by 1
        const bannersToShift = await prisma.banner.findMany({
          where: {
            position: {
              gte: newPosition,
              lt: oldPosition,
            },
            id: {
              not: bannerId, // Exclude current banner
            },
          },
        });

        for (const banner of bannersToShift) {
          await prisma.banner.update({
            where: { id: banner.id },
            data: {
              position: banner.position + 1,
            },
          });
        }
      } else {
        // Moving to later position (e.g., from 1 to 5)
        // Shift all banners from oldPosition+1 to newPosition down by 1
        const bannersToShift = await prisma.banner.findMany({
          where: {
            position: {
              gt: oldPosition,
              lte: newPosition,
            },
            id: {
              not: bannerId, // Exclude current banner
            },
          },
        });

        for (const banner of bannersToShift) {
          await prisma.banner.update({
            where: { id: banner.id },
            data: {
              position: banner.position - 1,
            },
          });
        }
      }
    } else {
      // Position is same, but check if someone else has this position
      // If yes, shift them and all after them
      const conflictingBanner = await prisma.banner.findFirst({
        where: {
          position: newPosition,
          id: {
            not: bannerId, // Exclude current banner
          },
        },
      });

      if (conflictingBanner) {
        // Shift all banners at or after this position (except current) up by 1
        const bannersToShift = await prisma.banner.findMany({
          where: {
            position: {
              gte: newPosition,
            },
            id: {
              not: bannerId, // Exclude current banner
            },
          },
        });

        for (const banner of bannersToShift) {
          await prisma.banner.update({
            where: { id: banner.id },
            data: {
              position: banner.position + 1,
            },
          });
        }
      }
    }
  }

  // Handle image uploads
  if (req.files) {
    if (req.files.desktopImage && req.files.desktopImage[0]) {
      // Delete old image
      if (existingBanner.desktopImage) {
        await deleteFromS3(existingBanner.desktopImage);
      }
      // Upload new image
      try {
        updateData.desktopImage = await processAndUploadImage(
          req.files.desktopImage[0]
        );
      } catch (error) {
        throw new ApiError(
          400,
          "Failed to upload desktop image: " + error.message
        );
      }
    }

    if (req.files.mobileImage && req.files.mobileImage[0]) {
      // Delete old image
      if (existingBanner.mobileImage) {
        await deleteFromS3(existingBanner.mobileImage);
      }
      // Upload new image
      try {
        updateData.mobileImage = await processAndUploadImage(
          req.files.mobileImage[0]
        );
      } catch (error) {
        throw new ApiError(
          400,
          "Failed to upload mobile image: " + error.message
        );
      }
    }
  }

  // Update banner
  const banner = await prisma.banner.update({
    where: { id: bannerId },
    data: updateData,
  });

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        banner: {
          ...banner,
          desktopImage: getFileUrl(banner.desktopImage),
          mobileImage: getFileUrl(banner.mobileImage),
        },
      },
      "Banner updated successfully"
    )
  );
});

// Delete banner (admin)
export const deleteBanner = asyncHandler(async (req, res, next) => {
  const { bannerId } = req.params;

  // Check if banner exists
  const banner = await prisma.banner.findUnique({
    where: { id: bannerId },
  });

  if (!banner) {
    throw new ApiError(404, "Banner not found");
  }

  const deletedPosition = banner.position;

  // Delete images from S3
  if (banner.desktopImage) {
    await deleteFromS3(banner.desktopImage);
  }
  if (banner.mobileImage) {
    await deleteFromS3(banner.mobileImage);
  }

  // Delete banner
  await prisma.banner.delete({
    where: { id: bannerId },
  });

  // Reorder remaining banners - decrease position of banners after deleted one
  const bannersToUpdate = await prisma.banner.findMany({
    where: {
      position: {
        gt: deletedPosition,
      },
    },
  });

  // Update positions one by one
  for (const banner of bannersToUpdate) {
    await prisma.banner.update({
      where: { id: banner.id },
      data: {
        position: banner.position - 1,
      },
    });
  }

  res
    .status(200)
    .json(new ApiResponsive(200, null, "Banner deleted successfully"));
});

// Toggle publish status (admin)
export const togglePublishBanner = asyncHandler(async (req, res, next) => {
  const { bannerId } = req.params;

  const banner = await prisma.banner.findUnique({
    where: { id: bannerId },
  });

  if (!banner) {
    throw new ApiError(404, "Banner not found");
  }

  const updatedBanner = await prisma.banner.update({
    where: { id: bannerId },
    data: {
      isPublished: !banner.isPublished,
    },
  });

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        banner: {
          ...updatedBanner,
          desktopImage: getFileUrl(updatedBanner.desktopImage),
          mobileImage: getFileUrl(updatedBanner.mobileImage),
        },
      },
      `Banner ${
        updatedBanner.isPublished ? "published" : "unpublished"
      } successfully`
    )
  );
});

// Get published banners (public)
export const getPublishedBanners = asyncHandler(async (req, res, next) => {
  const banners = await prisma.banner.findMany({
    where: {
      isPublished: true,
      isActive: true,
    },
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
  });

  // Format response with image URLs
  const formattedBanners = banners.map((banner) => ({
    id: banner.id,
    title: banner.title,
    subtitle: banner.subtitle,
    link: banner.link,
    desktopImage: banner.desktopImage ? getFileUrl(banner.desktopImage) : null,
    mobileImage: banner.mobileImage ? getFileUrl(banner.mobileImage) : null,
  }));

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { banners: formattedBanners },
        "Published banners fetched successfully"
      )
    );
});
