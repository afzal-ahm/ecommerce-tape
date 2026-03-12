import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { prisma } from "../config/db.js";
import { getFileUrl } from "../utils/deleteFromS3.js";
import { extractAllAttributes, extractColorAndSize } from "../utils/variant-attributes.js";

// Helper function to extract page name from path
function getPageNameFromPath(path) {
  if (!path) return "Unknown";

  // Remove query parameters
  const pathWithoutQuery = path.split("?")[0];

  // Split path into segments
  const segments = pathWithoutQuery.split("/").filter(Boolean);

  if (segments.length === 0) return "Home";

  // Convert path segments to readable names
  const lastSegment = segments[segments.length - 1];

  // Handle special cases
  if (lastSegment === "") return "Home";

  // Convert slug or path to readable name
  return lastSegment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

// Get most viewed pages
export const getMostViewedPages = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  // Get page views from database
  const pageViews = await prisma.pageView.groupBy({
    by: ["path"],
    _count: {
      path: true,
    },
    orderBy: {
      _count: {
        path: "desc",
      },
    },
    take: parseInt(limit),
  });

  const formattedPageViews = pageViews.map((view) => ({
    path: view.path,
    views: view._count.path,
    pageName: getPageNameFromPath(view.path),
  }));

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { pageViews: formattedPageViews },
        "Most viewed pages fetched successfully"
      )
    );
});

// Get most viewed products
export const getMostViewedProducts = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  // Get product views from database with product details
  const productViews = await prisma.productView.groupBy({
    by: ["productId"],
    _count: {
      productId: true,
    },
    orderBy: {
      _count: {
        productId: "desc",
      },
    },
    take: parseInt(limit),
  });

  // Get product details for each viewed product
  const formattedProductViews = await Promise.all(
    productViews.map(async (view) => {
      const product = await prisma.product.findUnique({
        where: { id: view.productId },
        include: {
          images: {
            where: { isPrimary: true },
            take: 1,
          },
          variants: {
            where: { isActive: true },
            orderBy: { price: "asc" },
            include: {
              attributes: {
                include: {
                  attributeValue: {
                    include: {
                      attribute: true,
                    },
                  },
                },
              },
            },
          },
          _count: {
            select: {
              variants: true,
            },
          },
        },
      });

      if (!product) {
        return {
          productId: view.productId,
          views: view._count.productId,
          product: {
            name: "Product not found",
            basePrice: 0,
            variants: 0,
          },
        };
      }

      // Get unique color and size counts from attributes
      const colorSet = new Set();
      const sizeSet = new Set();
      
      product.variants.forEach((variant) => {
        const attributes = extractAllAttributes(variant);
        if (attributes["Color"]) {
          colorSet.add(attributes["Color"].id);
        }
        if (attributes["Size"]) {
          sizeSet.add(attributes["Size"].id);
        }
      });

      return {
        productId: view.productId,
        views: view._count.productId,
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          image: product.images[0] ? getFileUrl(product.images[0].url) : null,
          basePrice:
            product.variants.length > 0
              ? parseFloat(
                  product.variants[0].salePrice || product.variants[0].price
                )
              : 0,
          variants: product._count.variants,
          variantInfo: {
            colors: colorSet.size,
            sizes: sizeSet.size,
          },
        },
      };
    })
  );

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { productViews: formattedProductViews },
        "Most viewed products fetched successfully"
      )
    );
});

// Get users with products in cart
export const getUsersWithProductsInCart = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  // Get users with active cart items
  const usersWithCarts = await prisma.user.findMany({
    where: {
      cartItems: {
        some: {
          quantity: { gt: 0 },
        },
      },
    },
    include: {
      cartItems: {
        include: {
          productVariant: {
            include: {
              attributes: {
                include: {
                  attributeValue: {
                    include: {
                      attribute: true,
                    },
                  },
                },
              },
              product: {
                include: {
                  images: {
                    where: { isPrimary: true },
                    take: 1,
                  },
                  categories: {
                    include: {
                      category: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
    take: parseInt(limit),
  });

  // Format the response
  const formattedUsers = usersWithCarts.map((user) => {
    // Calculate cart total
    const totalValue = user.cartItems.reduce((sum, item) => {
      const itemPrice = parseFloat(
        item.productVariant.salePrice || item.productVariant.price
      );
      return sum + itemPrice * item.quantity;
    }, 0);

    // Format cart items
    const cartItems = user.cartItems.map((item) => {
      // Get primary category if available
      const primaryCategory =
        item.productVariant.product.categories?.length > 0
          ? item.productVariant.product.categories[0].category
          : null;

      // Extract attributes dynamically
      const variantAttributes = extractAllAttributes(item.productVariant);
      const colorInfo = variantAttributes["Color"] || null;
      const sizeInfo = variantAttributes["Size"] || null;

      return {
        id: item.id,
        quantity: item.quantity,
        createdAt: item.createdAt,
        product: {
          id: item.productVariant.product.id,
          name: item.productVariant.product.name,
          image: item.productVariant.product.images[0]
            ? getFileUrl(item.productVariant.product.images[0].url)
            : null,
          category: primaryCategory
            ? {
                id: primaryCategory.id,
                name: primaryCategory.name,
                slug: primaryCategory.slug,
              }
            : null,
          variant: {
            id: item.productVariant.id,
            color: colorInfo?.name || null,
            colorImage: colorInfo?.image
              ? getFileUrl(colorInfo.image)
              : null,
            size: sizeInfo?.name || null,
            price: parseFloat(item.productVariant.price),
            salePrice: item.productVariant.salePrice
              ? parseFloat(item.productVariant.salePrice)
              : null,
            discount: item.productVariant.salePrice
              ? Math.round(
                  (1 -
                    parseFloat(item.productVariant.salePrice) /
                      parseFloat(item.productVariant.price)) *
                    100
                )
              : 0,
          },
        },
      };
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      totalItems: user.cartItems.length,
      totalValue,
      cartItems,
    };
  });

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { users: formattedUsers },
        "Users with products in cart fetched successfully"
      )
    );
});

// Get analytics dashboard data
export const getAnalyticsDashboard = asyncHandler(async (req, res) => {
  // Get total users
  const totalUsers = await prisma.user.count();

  // Get total products
  const totalProducts = await prisma.product.count();

  // Get total orders
  const totalOrders = await prisma.order.count();

  // Get today's orders
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayOrders = await prisma.order.count({
    where: {
      createdAt: {
        gte: today,
      },
    },
  });

  // Get total revenue
  const revenueResult = await prisma.order.aggregate({
    _sum: {
      total: true,
    },
    where: {
      status: {
        in: ["DELIVERED", "SHIPPED", "PROCESSING"],
      },
    },
  });
  const totalRevenue = revenueResult._sum.total || 0;

  // Get users with products in cart
  const usersWithCart = await prisma.user.count({
    where: {
      cart: {
        some: {
          quantity: {
            gt: 0,
          },
        },
      },
    },
  });

  // Get most viewed products (top 5)
  const topProducts = await prisma.productView.groupBy({
    by: ["productId"],
    _count: {
      productId: true,
    },
    orderBy: {
      _count: {
        productId: "desc",
      },
    },
    take: 5,
  });

  const productIds = topProducts.map((view) => view.productId);

  const products = await prisma.product.findMany({
    where: {
      id: {
        in: productIds,
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  const formattedTopProducts = topProducts.map((view) => {
    const product = products.find((p) => p.id === view.productId);
    return {
      productId: view.productId,
      views: view._count.productId,
      name: product?.name || "Unknown Product",
      slug: product?.slug || "",
    };
  });

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        counts: {
          users: totalUsers,
          products: totalProducts,
          orders: totalOrders,
          todayOrders,
          usersWithCart,
        },
        revenue: totalRevenue,
        topProducts: formattedTopProducts,
      },
      "Analytics dashboard data fetched successfully"
    )
  );
});
