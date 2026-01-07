import { Collection, ObjectId } from 'mongodb';
import { getDatabase } from '../config/database.js';

export interface Upload {
    _id?: ObjectId;
    userId: string;
    originalName: string;
    filename: string;
    size: number;
    mimetype: string;
    uploadedAt: Date;
    filePath: string;
}

export function getUploadsCollection(): Collection<Upload> {
    const db = getDatabase();
    return db.collection<Upload>('uploads');
}

export async function createUpload(uploadData: Omit<Upload, '_id'>): Promise<ObjectId> {
    const collection = getUploadsCollection();
    const result = await collection.insertOne(uploadData);
    return result.insertedId;
}

export async function getUploadsByUserId(userId: string): Promise<Upload[]> {
    const collection = getUploadsCollection();
    return collection.find({ userId }).sort({ uploadedAt: -1 }).toArray();
}

export async function deleteUploadByFilename(userId: string, filename: string): Promise<boolean> {
    const collection = getUploadsCollection();
    const result = await collection.deleteOne({ userId, filename });
    return result.deletedCount === 1;
}

export async function getUploadByFilename(userId: string, filename: string): Promise<Upload | null> {
    const collection = getUploadsCollection();
    return collection.findOne({ userId, filename });
}
