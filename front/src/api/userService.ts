import api from "./api";

// Types
interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface ProfileUpdateData {
  name?: string;
  email?: string;
  phone?: string;
}

interface AddressData {
  name: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
}

interface OrderQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  order?: "asc" | "desc";
}

// Authentication
export const auth = {
  register: (data: RegisterData) => {
    return api.post("/api/users/register", data);
  },
  login: (credentials: LoginCredentials) => {
    return api.post("/api/users/login", credentials);
  },
  logout: () => {
    return api.post("/api/users/logout");
  },
  forgotPassword: (email: string) => {
    return api.post("/api/users/forgot-password", { email });
  },
  resetPassword: (token: string, password: string) => {
    return api.post("/api/users/reset-password", { token, password });
  },
  verifyEmail: (token: string) => {
    return api.post("/api/users/verify-email", { token });
  },
};

// User Profile
export const profile = {
  getProfile: () => {
    return api.get("/api/users/profile");
  },
  updateProfile: (data: ProfileUpdateData) => {
    return api.patch("/api/users/profile", data);
  },
  changePassword: (currentPassword: string, newPassword: string) => {
    return api.post("/api/users/change-password", {
      currentPassword,
      newPassword,
    });
  },
};

// User Addresses
export const addresses = {
  getAddresses: () => {
    return api.get("/api/users/addresses");
  },
  getAddressById: (addressId: string) => {
    return api.get(`/api/users/addresses/${addressId}`);
  },
  addAddress: (data: AddressData) => {
    return api.post("/api/users/addresses", data);
  },
  updateAddress: (addressId: string, data: Partial<AddressData>) => {
    return api.patch(`/api/users/addresses/${addressId}`, data);
  },
  deleteAddress: (addressId: string) => {
    return api.delete(`/api/users/addresses/${addressId}`);
  },
  setDefaultAddress: (addressId: string) => {
    return api.patch(`/api/users/addresses/${addressId}/default`, {});
  },
};

// Orders
export const orders = {
  getOrders: (params: OrderQueryParams = {}) => {
    return api.get("/api/orders", { params });
  },
  getOrderById: (orderId: string) => {
    return api.get(`/api/orders/${orderId}`);
  },
  getOrderTracking: (orderId: string) => {
    return api.get(`/api/orders/${orderId}/tracking`);
  },
  cancelOrder: (orderId: string, reason?: string) => {
    return api.post(`/api/orders/${orderId}/cancel`, { reason });
  },
};

// Cart
export const cart = {
  getCart: () => {
    return api.get("/api/cart");
  },
  addToCart: (productVariantId: string, quantity: number) => {
    return api.post("/api/cart", { productVariantId, quantity });
  },
  updateCartItem: (itemId: string, quantity: number) => {
    return api.patch(`/api/cart/${itemId}`, { quantity });
  },
  removeCartItem: (itemId: string) => {
    return api.delete(`/api/cart/${itemId}`);
  },
  clearCart: () => {
    return api.delete("/api/cart");
  },
  applyCoupon: (code: string) => {
    return api.post("/api/cart/apply-coupon", { code });
  },
  removeCoupon: () => {
    return api.delete("/api/cart/coupon");
  },
};

// Wishlist
export const wishlist = {
  getWishlist: () => {
    return api.get("/api/wishlist");
  },
  addToWishlist: (productId: string) => {
    return api.post("/api/wishlist", { productId });
  },
  removeFromWishlist: (itemId: string) => {
    return api.delete(`/api/wishlist/${itemId}`);
  },
};

// Reviews
export const reviews = {
  getMyReviews: () => {
    return api.get("/api/users/reviews");
  },
  addReview: (
    productId: string,
    data: { rating: number; title?: string; comment?: string }
  ) => {
    return api.post(`/api/products/${productId}/reviews`, data);
  },
  updateReview: (
    reviewId: string,
    data: { rating?: number; title?: string; comment?: string }
  ) => {
    return api.patch(`/api/reviews/${reviewId}`, data);
  },
  deleteReview: (reviewId: string) => {
    return api.delete(`/api/reviews/${reviewId}`);
  },
};

// Checkout
export const checkout = {
  createOrder: (data: {
    addressId: string;
    couponCode?: string;
    paymentMethod: "RAZORPAY" | "COD";
  }) => {
    return api.post("/api/orders", data);
  },
  initiatePayment: (orderId: string) => {
    return api.post(`/api/payment/razorpay/create`, { orderId });
  },
  verifyPayment: (data: {
    orderId: string;
    paymentId: string;
    signature: string;
  }) => {
    return api.post("/api/payment/razorpay/verify", data);
  },
  getPaymentStatus: (orderId: string) => {
    return api.get(`/api/payment/status/${orderId}`);
  },
};
