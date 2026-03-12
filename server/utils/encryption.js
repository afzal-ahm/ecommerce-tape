import crypto from "crypto";

// Encryption key from environment (should be 64 hex characters = 32 bytes for AES-256)
// If not provided, generate a random one (but this won't work for decryption!)
const ENCRYPTION_KEY_RAW = process.env.ENCRYPTION_KEY;
const ALGORITHM = "aes-256-gcm";

// Validate and prepare encryption key
function getEncryptionKey() {
    if (!ENCRYPTION_KEY_RAW) {
        throw new Error("ENCRYPTION_KEY environment variable is required. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
    }

    // If key is hex string, it should be 64 characters (32 bytes * 2)
    // If it's shorter, pad it or use it directly as bytes
    let key;
    if (ENCRYPTION_KEY_RAW.length === 64) {
        // Valid hex string (64 chars = 32 bytes)
        key = Buffer.from(ENCRYPTION_KEY_RAW, "hex");
    } else if (ENCRYPTION_KEY_RAW.length >= 32) {
        // Use first 32 characters as raw bytes
        key = Buffer.from(ENCRYPTION_KEY_RAW.slice(0, 32), "utf8");
    } else {
        // Pad to 32 bytes using SHA256 hash
        key = crypto.createHash("sha256").update(ENCRYPTION_KEY_RAW).digest();
    }

    if (key.length !== 32) {
        throw new Error("Encryption key must be 32 bytes. Current length: " + key.length);
    }

    return key;
}

/**
 * Encrypt sensitive data (payment keys)
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted text with IV and auth tag
 */
export function encrypt(text) {
    if (!text) return null;

    try {
        const key = getEncryptionKey();
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        let encrypted = cipher.update(text, "utf8", "hex");
        encrypted += cipher.final("hex");

        const authTag = cipher.getAuthTag();

        // Return IV:AuthTag:EncryptedData
        return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
    } catch (error) {
        console.error("Encryption error:", error);
        throw new Error("Failed to encrypt data");
    }
}

/**
 * Decrypt sensitive data (payment keys)
 * @param {string} encryptedText - Encrypted text with IV and auth tag
 * @returns {string} - Decrypted plain text
 */
export function decrypt(encryptedText) {
    if (!encryptedText) return null;

    try {
        const key = getEncryptionKey();
        const parts = encryptedText.split(":");

        if (parts.length !== 3) {
            throw new Error("Invalid encrypted data format");
        }

        const iv = Buffer.from(parts[0], "hex");
        const authTag = Buffer.from(parts[1], "hex");
        const encrypted = parts[2];

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, "hex", "utf8");
        decrypted += decipher.final("utf8");

        return decrypted;
    } catch (error) {
        console.error("Decryption error:", error);
        throw new Error("Failed to decrypt data");
    }
}

/**
 * Mask sensitive data for display (show only last 4 characters)
 * @param {string} text - Text to mask
 * @returns {string} - Masked text
 */
export function maskSecret(text) {
    if (!text || text.length <= 4) return "****";
    return "****" + text.slice(-4);
}

