import { Collection, ObjectId } from 'mongodb';
import { getDatabase } from '../config/database.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { encrypt, decrypt, type EncryptedData } from '../utils/encryption.js';
import config from '../config/config.js';

export interface User {
    _id?: ObjectId;
    email: string;
    password: string; // hashed
    isVerified: boolean;
    verificationToken?: string;
    verificationTokenExpiry?: Date;
    resetPasswordToken?: string;
    resetPasswordTokenExpiry?: Date;
    refreshTokens: string[]; // Store hashed refresh tokens for revocation
    binanceApiKey?: EncryptedData; // Encrypted Binance API key
    binanceApiSecret?: EncryptedData; // Encrypted Binance API secret
    binanceApiConfiguredAt?: Date; // Timestamp when Binance API was last configured
    createdAt: Date;
    updatedAt: Date;
}

export interface UserResponse {
    _id: string;
    email: string;
    isVerified: boolean;
    createdAt: Date;
}

const SALT_ROUNDS = 12;

export function getUsersCollection(): Collection<User> {
    const db = getDatabase();
    return db.collection<User>('users');
}

// Initialize indexes for users collection
export async function initializeUserIndexes(): Promise<void> {
    const collection = getUsersCollection();
    await collection.createIndex({ email: 1 }, { unique: true });
    await collection.createIndex({ verificationToken: 1 }, { sparse: true });
    await collection.createIndex({ resetPasswordToken: 1 }, { sparse: true });
    await collection.createIndex({ binanceApiConfiguredAt: 1 }, { sparse: true }); // For finding users with Binance configured
}

// Password hashing
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
}

// Token generation
export function generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

export function generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

// Hash refresh token for storage (prevent token reuse if DB is compromised)
export function hashRefreshToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

// User CRUD operations
export async function createUser(userData: {
    email: string;
    password: string;
}): Promise<{ userId: ObjectId; verificationToken: string }> {
    const collection = getUsersCollection();

    const hashedPassword = await hashPassword(userData.password);
    const verificationToken = generateVerificationToken();
    const now = new Date();

    const user: Omit<User, '_id'> = {
        email: userData.email.toLowerCase().trim(),
        password: hashedPassword,
        isVerified: false,
        verificationToken,
        verificationTokenExpiry: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours
        refreshTokens: [],
        createdAt: now,
        updatedAt: now,
    };

    const result = await collection.insertOne(user);
    return { userId: result.insertedId, verificationToken };
}

export async function findUserByEmail(email: string): Promise<User | null> {
    const collection = getUsersCollection();
    return collection.findOne({ email: email.toLowerCase().trim() });
}

export async function findUserById(userId: string): Promise<User | null> {
    const collection = getUsersCollection();
    return collection.findOne({ _id: new ObjectId(userId) });
}

export async function verifyUserEmail(verificationToken: string): Promise<boolean> {
    const collection = getUsersCollection();
    const result = await collection.updateOne(
        {
            verificationToken,
            verificationTokenExpiry: { $gt: new Date() },
        },
        {
            $set: {
                isVerified: true,
                updatedAt: new Date(),
            },
            $unset: {
                verificationToken: '',
                verificationTokenExpiry: '',
            },
        }
    );
    return result.modifiedCount === 1;
}

export async function setResetPasswordToken(email: string): Promise<string | null> {
    const collection = getUsersCollection();
    const resetToken = generateResetToken();
    const now = new Date();

    const result = await collection.updateOne(
        { email: email.toLowerCase().trim() },
        {
            $set: {
                resetPasswordToken: resetToken,
                resetPasswordTokenExpiry: new Date(now.getTime() + 1 * 60 * 60 * 1000), // 1 hour
                updatedAt: now,
            },
        }
    );

    return result.modifiedCount === 1 ? resetToken : null;
}

export async function resetPassword(resetToken: string, newPassword: string): Promise<boolean> {
    const collection = getUsersCollection();
    const hashedPassword = await hashPassword(newPassword);

    const result = await collection.updateOne(
        {
            resetPasswordToken: resetToken,
            resetPasswordTokenExpiry: { $gt: new Date() },
        },
        {
            $set: {
                password: hashedPassword,
                updatedAt: new Date(),
                refreshTokens: [], // Invalidate all sessions on password reset
            },
            $unset: {
                resetPasswordToken: '',
                resetPasswordTokenExpiry: '',
            },
        }
    );

    return result.modifiedCount === 1;
}

export async function addRefreshToken(userId: string, refreshToken: string): Promise<boolean> {
    const collection = getUsersCollection();
    const hashedToken = hashRefreshToken(refreshToken);

    const result = await collection.updateOne(
        { _id: new ObjectId(userId) },
        {
            $push: { refreshTokens: hashedToken },
            $set: { updatedAt: new Date() },
        }
    );

    return result.modifiedCount === 1;
}

export async function removeRefreshToken(userId: string, refreshToken: string): Promise<boolean> {
    const collection = getUsersCollection();
    const hashedToken = hashRefreshToken(refreshToken);

    const result = await collection.updateOne(
        { _id: new ObjectId(userId) },
        {
            $pull: { refreshTokens: hashedToken },
            $set: { updatedAt: new Date() },
        }
    );

    return result.modifiedCount === 1;
}

export async function hasValidRefreshToken(userId: string, refreshToken: string): Promise<boolean> {
    const collection = getUsersCollection();
    const hashedToken = hashRefreshToken(refreshToken);

    const user = await collection.findOne({
        _id: new ObjectId(userId),
        refreshTokens: hashedToken,
    });

    return user !== null;
}

export async function clearAllRefreshTokens(userId: string): Promise<boolean> {
    const collection = getUsersCollection();
    const result = await collection.updateOne(
        { _id: new ObjectId(userId) },
        {
            $set: {
                refreshTokens: [],
                updatedAt: new Date(),
            },
        }
    );

    return result.modifiedCount === 1;
}

// Convert User to UserResponse (exclude sensitive fields)
export function toUserResponse(user: User): UserResponse {
    return {
        _id: user._id!.toString(),
        email: user.email,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
    };
}

// ==================== Binance API Key Management ====================

/**
 * Update or set Binance API credentials for a user
 * @param userId User ID
 * @param apiKey Binance API key (plaintext)
 * @param apiSecret Binance API secret (plaintext)
 * @returns true if update successful
 */
export async function updateBinanceCredentials(
    userId: string,
    apiKey: string,
    apiSecret: string
): Promise<boolean> {
    const collection = getUsersCollection();
    const encryptionKey = config.binance.encryptionKey;

    if (!encryptionKey) {
        throw new Error('BINANCE_ENCRYPTION_KEY is not configured');
    }

    // Encrypt the credentials
    const encryptedApiKey = encrypt(apiKey, encryptionKey);
    const encryptedApiSecret = encrypt(apiSecret, encryptionKey);

    const result = await collection.updateOne(
        { _id: new ObjectId(userId) },
        {
            $set: {
                binanceApiKey: encryptedApiKey,
                binanceApiSecret: encryptedApiSecret,
                binanceApiConfiguredAt: new Date(),
                updatedAt: new Date(),
            },
        }
    );

    return result.modifiedCount === 1;
}

/**
 * Remove Binance API credentials from a user
 * @param userId User ID
 * @returns true if removal successful
 */
export async function removeBinanceCredentials(userId: string): Promise<boolean> {
    const collection = getUsersCollection();

    const result = await collection.updateOne(
        { _id: new ObjectId(userId) },
        {
            $unset: {
                binanceApiKey: '',
                binanceApiSecret: '',
                binanceApiConfiguredAt: '',
            },
            $set: {
                updatedAt: new Date(),
            },
        }
    );

    return result.modifiedCount === 1;
}

/**
 * Get decrypted Binance API credentials for a user
 * @param userId User ID
 * @returns Object with apiKey and apiSecret (plaintext) or null if not configured
 */
export async function getBinanceCredentials(
    userId: string
): Promise<{ apiKey: string; apiSecret: string } | null> {
    const collection = getUsersCollection();
    const encryptionKey = config.binance.encryptionKey;

    if (!encryptionKey) {
        throw new Error('BINANCE_ENCRYPTION_KEY is not configured');
    }

    const user = await collection.findOne(
        { _id: new ObjectId(userId) },
        { projection: { binanceApiKey: 1, binanceApiSecret: 1 } }
    );

    if (!user || !user.binanceApiKey || !user.binanceApiSecret) {
        return null;
    }

    try {
        const apiKey = decrypt(
            user.binanceApiKey.encrypted,
            user.binanceApiKey.iv,
            user.binanceApiKey.authTag,
            encryptionKey
        );

        const apiSecret = decrypt(
            user.binanceApiSecret.encrypted,
            user.binanceApiSecret.iv,
            user.binanceApiSecret.authTag,
            encryptionKey
        );

        return { apiKey, apiSecret };
    } catch (error) {
        throw new Error('Failed to decrypt Binance credentials. Please reconfigure your API keys.');
    }
}

/**
 * Check if a user has Binance API keys configured
 * @param userId User ID
 * @returns true if API keys are configured
 */
export async function hasBinanceApiKeys(userId: string): Promise<boolean> {
    const collection = getUsersCollection();

    const user = await collection.findOne(
        { _id: new ObjectId(userId) },
        { projection: { binanceApiKey: 1 } }
    );

    return !!(user && user.binanceApiKey);
}

/**
 * Get list of all users with Binance API keys configured (for scheduler)
 * @returns Array of user IDs with Binance configured
 */
export async function getUsersWithBinanceConfigured(): Promise<string[]> {
    const collection = getUsersCollection();

    const users = await collection
        .find(
            { binanceApiConfiguredAt: { $exists: true } },
            { projection: { _id: 1 } }
        )
        .toArray();

    return users.map((user) => user._id!.toString());
}
