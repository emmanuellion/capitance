import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // AES block size
const KEY_LENGTH = 32; // 256 bits
const AUTH_TAG_LENGTH = 16;

export interface EncryptedData {
    encrypted: string;
    iv: string;
    authTag: string;
}

/**
 * Validates that the encryption key is properly formatted
 * @param key Hex-encoded encryption key (should be 64 hex characters = 32 bytes)
 * @throws Error if key is invalid
 */
export function validateEncryptionKey(key: string | undefined): void {
    if (!key) {
        throw new Error('Encryption key is not configured. Please set BINANCE_ENCRYPTION_KEY environment variable.');
    }

    // Key should be 64 hex characters (32 bytes)
    if (key.length !== KEY_LENGTH * 2) {
        throw new Error(`Encryption key must be ${KEY_LENGTH * 2} hex characters (${KEY_LENGTH} bytes). Current length: ${key.length}`);
    }

    // Verify it's valid hex
    if (!/^[0-9a-fA-F]+$/.test(key)) {
        throw new Error('Encryption key must be a valid hexadecimal string.');
    }
}

/**
 * Generate a random encryption key for BINANCE_ENCRYPTION_KEY
 * @returns 64-character hex string (32 bytes)
 */
export function generateEncryptionKey(): string {
    return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Encrypt plaintext using AES-256-GCM
 * @param plaintext The text to encrypt
 * @param key Hex-encoded encryption key (32 bytes / 64 hex chars)
 * @returns Object containing encrypted data, IV, and authentication tag
 */
export function encrypt(plaintext: string, key: string): EncryptedData {
    validateEncryptionKey(key);

    // Convert hex key to Buffer
    const keyBuffer = Buffer.from(key, 'hex');

    // Generate random IV
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

    // Encrypt
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
    };
}

/**
 * Decrypt ciphertext using AES-256-GCM
 * @param encrypted Hex-encoded encrypted data
 * @param iv Hex-encoded initialization vector
 * @param authTag Hex-encoded authentication tag
 * @param key Hex-encoded encryption key (32 bytes / 64 hex chars)
 * @returns Decrypted plaintext
 * @throws Error if authentication fails or decryption fails
 */
export function decrypt(
    encrypted: string,
    iv: string,
    authTag: string,
    key: string
): string {
    validateEncryptionKey(key);

    try {
        // Convert hex to Buffers
        const keyBuffer = Buffer.from(key, 'hex');
        const ivBuffer = Buffer.from(iv, 'hex');
        const authTagBuffer = Buffer.from(authTag, 'hex');

        // Create decipher
        const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, ivBuffer);
        decipher.setAuthTag(authTagBuffer);

        // Decrypt
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        // Authentication failed or decryption error
        throw new Error('Decryption failed. Data may have been tampered with or key is incorrect.');
    }
}

/**
 * Mask sensitive data for display (show first and last 4 characters)
 * @param value Sensitive string to mask
 * @returns Masked string like "ABCD****WXYZ"
 */
export function maskSensitiveData(value: string): string {
    if (!value || value.length <= 8) {
        return '****';
    }

    const first4 = value.substring(0, 4);
    const last4 = value.substring(value.length - 4);
    const middle = '*'.repeat(Math.min(value.length - 8, 20)); // Cap at 20 stars for display

    return `${first4}${middle}${last4}`;
}
