import api from "./api";

// Types
export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  order: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

// Get all FAQs (admin)
export const getAllFaqs = async () => {
  try {
    const response = await api.get("/api/admin/faqs");

    // Ensure the response structure is valid and faqs are an array
    const faqs = response?.data?.data;

    if (Array.isArray(faqs)) {
      return {
        ...response,
        data: {
          faqs: faqs,
        },
      };
    }

    // If the structure isn't as expected, just return the response data
    return response?.data || {};
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    throw new Error('Failed to fetch FAQs');
  }
};


// Get all published FAQs (public)
export const getPublishedFaqs = async () => {
  const response = await api.get("/faqs");
  return response.data;
};

// Get FAQ by ID
export const getFaqById = async (id: string) => {
  const response = await api.get(`/api/admin/faqs/${id}`);
  return response.data;
};

// Create a new FAQ
export const createFaq = async (
  faqData: Omit<FAQ, "id" | "createdAt" | "updatedAt">
) => {
  const response = await api.post("/api/admin/faqs", faqData);
  return response.data;
};

// Update an existing FAQ
export const updateFaq = async (
  id: string,
  faqData: Partial<Omit<FAQ, "id" | "createdAt" | "updatedAt">>
) => {
  try {
    // If we're only updating isPublished or other fields but not question/answer,
    // we need to get the full FAQ first to include required fields
    if (!faqData.question || !faqData.answer) {
      const existingFaq = await getFaqById(id);
      const fullData = {
        ...existingFaq.data.faq,
        ...faqData,
      };

      // Ensure question and answer are included
      const updatePayload = {
        ...faqData,
        question: fullData.question,
        answer: fullData.answer,
      };

      const response = await api.put(`/api/admin/faqs/${id}`, updatePayload);
      return response.data;
    } else {
      // If question and answer are already included in the update, proceed normally
      const response = await api.put(`/api/admin/faqs/${id}`, faqData);
      return response.data;
    }
  } catch (error) {
    console.error("Error updating FAQ:", error);
    throw error;
  }
};

// Delete an FAQ
export const deleteFaq = async (id: string) => {
  const response = await api.delete(`/api/admin/faqs/${id}`);
  return response.data;
};

// Bulk update FAQ order
export const updateFaqOrder = async (
  faqs: { id: string; order: number }[],
  allFaqs?: FAQ[]
) => {
  try {
    console.log("Preparing to update FAQ order");

    // First, we need to get all FAQs if not provided
    let faqsData: FAQ[] = allFaqs || [];
    if (faqsData.length === 0) {
      console.log("No FAQ data provided, fetching all FAQs");
      try {
        const response = await getAllFaqs();

        if (response?.data?.faqs && Array.isArray(response.data.faqs)) {
          faqsData = response.data.faqs;
        } else if (Array.isArray(response?.data)) {
          faqsData = response.data;
        } else if (response?.data?.data && Array.isArray(response.data.data)) {
          faqsData = response.data.data;
        } else {
          console.error("Could not get FAQ data for order update");
          throw new Error("Failed to retrieve FAQ data for ordering");
        }
      } catch (fetchError) {
        console.error("Error fetching FAQs for order update:", fetchError);
        throw fetchError;
      }
    }

    // Create a map of all FAQs by ID for quick lookup
    const faqMap = new Map();
    faqsData.forEach((faq) => {
      faqMap.set(faq.id, faq);
    });

    // Create payload with complete FAQ objects including required fields
    const completePayload = faqs
      .map((item) => {
        const originalFaq = faqMap.get(item.id);
        if (!originalFaq) {
          console.error(`FAQ with ID ${item.id} not found in data`);
          return null;
        }

        // Return complete object with all required fields
        return {
          id: item.id,
          order: item.order,
          question: originalFaq.question,
          answer: originalFaq.answer,
          category: originalFaq.category,
          isPublished: originalFaq.isPublished,
        };
      })
      .filter(Boolean) as Omit<FAQ, "createdAt" | "updatedAt">[]; // Remove any null entries

    if (completePayload.length === 0) {
      throw new Error("No valid FAQs to update order");
    }

    console.log(
      "Sending complete FAQ payload for order update:",
      completePayload
    );

    // Make the actual API request with complete objects
    const response = await api.put("/api/admin/faqs/bulk-update-order", {
      faqs: completePayload,
    });

    console.log("Order update successful:", response.data);
    return response.data;
  } catch (error: any) {
    console.error("Error updating FAQ order:", error);

    // Log more details about the error
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }

    throw error;
  }
};

// Get all FAQ categories
export const getFaqCategories = async () => {
  const response = await api.get("/api/admin/faqs/categories");
  return response.data;
};
