import { prisma } from "../config/db.js";

// Middleware to track page views
export const trackPageView = async (req, res, next) => {
  try {
    // Skip tracking for API requests and admin routes
    const path = req.originalUrl;
    if (path.startsWith("/api/") || path.startsWith("/admin/")) {
      return next();
    }

    // Get user ID if authenticated
    const userId = req.user?.id;

    // Generate or use session ID (could be from cookies or headers)
    const sessionId =
      req.cookies?.sessionId ||
      req.headers["x-session-id"] ||
      generateSessionId();

    // Record page view asynchronously (don't wait for it to complete)
    prisma.pageView
      .create({
        data: {
          path,
          userId,
          sessionId,
        },
      })
      .catch((err) => {
        console.error("Error tracking page view:", err);
      });

    // Continue with the request
    next();
  } catch (error) {
    // Log error but don't interrupt the request
    console.error("Error in tracking middleware:", error);
    next();
  }
};

// Middleware to track product views
export const trackProductView = async (req, res, next) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return next();
    }

    // Find product by slug
    const product = await prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!product) {
      return next();
    }

    // Get user ID if authenticated
    const userId = req.user?.id;

    // Generate or use session ID
    const sessionId =
      req.cookies?.sessionId ||
      req.headers["x-session-id"] ||
      generateSessionId();

    // Record product view asynchronously
    prisma.productView
      .create({
        data: {
          productId: product.id,
          userId,
          sessionId,
        },
      })
      .catch((err) => {
        console.error("Error tracking product view:", err);
      });

    // Continue with the request
    next();
  } catch (error) {
    // Log error but don't interrupt the request
    console.error("Error in product tracking middleware:", error);
    next();
  }
};

// Helper function to generate a random session ID
function generateSessionId() {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}
