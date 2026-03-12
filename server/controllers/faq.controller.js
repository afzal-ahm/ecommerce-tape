import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../config/db.js";

// Get all published FAQs (for public viewing)
export const getAllPublishedFaqs = asyncHandler(async (req, res) => {
  const faqs = await prisma.FAQ.findMany({
    where: {
      isPublished: true,
    },
    orderBy: {
      order: "asc",
    },
  });

  res
    .status(200)
    .json(new ApiResponsive(200, { faqs }, "FAQs fetched successfully"));
});

// Admin: Get all FAQs (published and unpublished)
export const getAllFaqs = asyncHandler(async (req, res) => {
  const faqs = await prisma.FAQ.findMany({
    orderBy: [{ order: "asc" }],
  });

  res
    .status(200)
    .json(new ApiResponsive(200, { faqs }, "All FAQs fetched successfully"));
});

// Admin: Create a new FAQ
export const createFaq = asyncHandler(async (req, res) => {
  const { question, answer, category, isPublished = true } = req.body;

  if (!question || !answer) {
    throw new ApiError(400, "Question and answer are required");
  }

  try {
    // Start a transaction
    await prisma.$transaction(async (tx) => {
      // Get the maximum order value
      const maxOrderFaq = await tx.FAQ.findFirst({
        orderBy: {
          order: "desc",
        },
      });

      // Set the new FAQ's order to be the maximum + 1 (or 1 if there are no existing FAQs)
      const newOrder = maxOrderFaq ? maxOrderFaq.order + 1 : 1;

      // Create the new FAQ with the correct order
      const faq = await tx.FAQ.create({
        data: {
          question,
          answer,
          category,
          order: newOrder,
          isPublished,
        },
      });

      // Return the created FAQ
      res
        .status(201)
        .json(new ApiResponsive(201, { faq }, "FAQ created successfully"));
    });
  } catch (error) {
    throw new ApiError(500, `Error creating FAQ: ${error.message}`);
  }
});

// Admin: Update an existing FAQ
export const updateFaq = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { question, answer, category, order, isPublished } = req.body;

  try {
    // Check if FAQ exists
    const existingFaq = await prisma.FAQ.findUnique({
      where: { id },
    });

    if (!existingFaq) {
      throw new ApiError(404, "FAQ not found");
    }

    // Make sure question and answer are always included with proper validation
    // Either use the provided values or fall back to existing values
    const updatedQuestion =
      question !== undefined ? question : existingFaq.question;
    const updatedAnswer = answer !== undefined ? answer : existingFaq.answer;

    // Validate that required fields are not empty
    if (!updatedQuestion || !updatedAnswer) {
      throw new ApiError(400, "Question and answer are required");
    }

    // Prepare update data
    const updateData = {
      question: updatedQuestion,
      answer: updatedAnswer,
      // Optional fields
      ...(category !== undefined ? { category } : {}),
      ...(order !== undefined ? { order: parseInt(order) } : {}),
      ...(isPublished !== undefined ? { isPublished } : {}),
    };

    // Update the FAQ
    const updatedFaq = await prisma.FAQ.update({
      where: { id },
      data: updateData,
    });

    res
      .status(200)
      .json(
        new ApiResponsive(200, { faq: updatedFaq }, "FAQ updated successfully")
      );
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, `Error updating FAQ: ${error.message}`);
  }
});

// Admin: Delete an FAQ
export const deleteFaq = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // Start a transaction for deletion and reordering
    await prisma.$transaction(async (tx) => {
      // Check if FAQ exists
      const existingFaq = await tx.FAQ.findUnique({
        where: { id },
      });

      if (!existingFaq) {
        throw new ApiError(404, "FAQ not found");
      }

      // Store the order of the FAQ being deleted
      const deletedOrder = existingFaq.order;

      // Delete the FAQ
      await tx.FAQ.delete({
        where: { id },
      });

      // Update orders of remaining FAQs to maintain sequential ordering
      await tx.FAQ.updateMany({
        where: {
          order: {
            gt: deletedOrder,
          },
        },
        data: {
          order: {
            decrement: 1,
          },
        },
      });

      res
        .status(200)
        .json(new ApiResponsive(200, null, "FAQ deleted successfully"));
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, `Error deleting FAQ: ${error.message}`);
  }
});

// Get FAQ by ID
export const getFaqById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const faq = await prisma.FAQ.findUnique({
    where: { id },
  });

  if (!faq) {
    throw new ApiError(404, "FAQ not found");
  }

  res
    .status(200)
    .json(new ApiResponsive(200, { faq }, "FAQ fetched successfully"));
});

// Bulk update order of FAQs
export const bulkUpdateFaqOrder = asyncHandler(async (req, res) => {
  console.log("========== BULK UPDATE FAQ ORDER ==========");
  console.log("Request body:", JSON.stringify(req.body, null, 2));

  // Extract the faqs array from the request body
  const { faqs } = req.body;

  // Input validation
  if (!faqs) {
    console.error("No faqs array found in request body");
    throw new ApiError(400, "No faqs array provided in request body");
  }

  if (!Array.isArray(faqs)) {
    console.error("faqs is not an array, it is:", typeof faqs);
    throw new ApiError(400, "faqs must be an array");
  }

  if (faqs.length === 0) {
    console.error("faqs array is empty");
    throw new ApiError(400, "faqs array cannot be empty");
  }

  // Log individual FAQ entries to check format
  console.log("FAQ entries to update:");
  faqs.forEach((faq, index) => {
    console.log(`  [${index}] id: ${faq.id}, order: ${faq.order}`);
  });

  try {
    // First, validate all FAQs exist
    console.log("Validating FAQ IDs exist in database...");

    // Extract all FAQ IDs
    const faqIds = faqs.map((faq) => faq.id);

    // Count existing FAQs with these IDs
    const existingCount = await prisma.FAQ.count({
      where: {
        id: {
          in: faqIds,
        },
      },
    });

    console.log(
      `Found ${existingCount} FAQs out of ${faqIds.length} requested`
    );

    // Check all FAQs exist
    if (existingCount !== faqIds.length) {
      console.error(
        `Some FAQs not found. Expected ${faqIds.length}, found ${existingCount}`
      );
      throw new ApiError(404, `Some FAQs not found`);
    }

    // Update each FAQ's order using executeRawUnsafe for direct SQL
    console.log("Updating FAQ orders with direct SQL...");

    // Execute each update as a separate query
    for (let i = 0; i < faqs.length; i++) {
      const faq = faqs[i];
      const newOrder = i + 1; // Start from 1

      console.log(`Setting FAQ ${faq.id} order to ${newOrder}`);

      try {
        // Direct SQL update that skips model validation
        await prisma.$executeRawUnsafe(
          `UPDATE "FAQ" SET "order" = ${newOrder} WHERE id = '${faq.id}'`
        );
        console.log(`Updated FAQ ${faq.id} successfully`);
      } catch (updateError) {
        console.error(`Error updating FAQ ${faq.id}:`, updateError);
        throw new ApiError(
          500,
          `Error updating FAQ ${faq.id}: ${updateError.message}`
        );
      }
    }

    console.log("All FAQ orders updated successfully");
    return res
      .status(200)
      .json(
        new ApiResponsive(
          200,
          { success: true },
          "FAQ order updated successfully"
        )
      );
  } catch (error) {
    console.error("Error in bulkUpdateFaqOrder:", error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, `Error updating FAQ order: ${error.message}`);
  }
});

// Get all FAQ categories
export const getFaqCategories = asyncHandler(async (req, res) => {
  const categories = await prisma.FAQ.groupBy({
    by: ["category"],
    _count: {
      id: true,
    },
  });

  const formattedCategories = categories
    .filter((cat) => cat.category) // Filter out null categories
    .map((cat) => ({
      name: cat.category,
      count: cat._count.id,
    }));

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { categories: formattedCategories },
        "FAQ categories fetched successfully"
      )
    );
});
