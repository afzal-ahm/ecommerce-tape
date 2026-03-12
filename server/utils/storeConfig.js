/**
 * Store Configuration Utility
 * Centralized configuration for store name, email, and other store-specific settings
 * All values can be overridden via environment variables
 */

export const getStoreConfig = () => {
  return {
    // Store Information
    storeName: process.env.STORE_NAME || "D fix",
    storeEmail: process.env.STORE_EMAIL || "store@example.com",
    storePhone: process.env.STORE_PHONE || "+1234567890",
    storeAddress:
      process.env.STORE_ADDRESS || "123 Store Street, City, Country",

    // Store Description/Tagline
    storeTagline: process.env.STORE_TAGLINE || "Premium Quality Products",
    storeDescription:
      process.env.STORE_DESCRIPTION ||
      "Your trusted source for premium quality products",

    // Email Configuration
    fromName: process.env.FROM_NAME || process.env.STORE_NAME || "D fix",
    fromEmail:
      process.env.FROM_EMAIL ||
      process.env.STORE_EMAIL ||
      process.env.SMTP_USER ||
      "store@example.com",

    // Website Information
    websiteUrl: process.env.WEBSITE_URL || "https://yourstore.com",
    supportEmail:
      process.env.SUPPORT_EMAIL ||
      process.env.STORE_EMAIL ||
      "dfixventure@gmail.com",

    // Social Media (optional)
    socialFacebook: process.env.SOCIAL_FACEBOOK || "",
    socialTwitter: process.env.SOCIAL_TWITTER || "",
    socialInstagram: process.env.SOCIAL_INSTAGRAM || "",
    socialYoutube: process.env.SOCIAL_YOUTUBE || "",
  };
};

/**
 * Get store name
 */
export const getStoreName = () => {
  return getStoreConfig().storeName;
};

/**
 * Get store email
 */
export const getStoreEmail = () => {
  return getStoreConfig().storeEmail;
};

/**
 * Get from name for emails
 */
export const getFromName = () => {
  return getStoreConfig().fromName;
};

/**
 * Get from email for emails
 */
export const getFromEmail = () => {
  return getStoreConfig().fromEmail;
};

/**
 * Get full store information object
 */
export const getFullStoreInfo = () => {
  const config = getStoreConfig();
  return {
    name: config.storeName,
    email: config.storeEmail,
    phone: config.storePhone,
    address: config.storeAddress,
    tagline: config.storeTagline,
    description: config.storeDescription,
    websiteUrl: config.websiteUrl,
    supportEmail: config.supportEmail,
    fromName: config.fromName,
    fromEmail: config.fromEmail,
    social: {
      facebook: config.socialFacebook,
      twitter: config.socialTwitter,
      instagram: config.socialInstagram,
      youtube: config.socialYoutube,
    },
  };
};

export default getStoreConfig;
