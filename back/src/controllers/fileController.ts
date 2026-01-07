import { type Request, type Response, type NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { createUpload, getUploadsByUserId, deleteUploadByFilename, getUploadByFilename, updateUpload } from '../models/Upload.js';
import { processUpload } from '../services/snapshotService.js';
import { deleteSnapshotByUploadId } from '../models/PortfolioSnapshot.js';
import logger from '../utils/logger.js';
import { cacheService } from '../services/cacheService.js';

export const getFile = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Verify authentication
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
            return;
        }

        // Retrieve all uploads for this user from MongoDB
        const uploads = await getUploadsByUserId(req.user.userId);

        const filesInfo = uploads.map((upload) => ({
            _id: upload._id?.toString(),
            filename: upload.filename,
            originalName: upload.originalName,
            size: upload.size,
            mimetype: upload.mimetype,
            uploadedAt: upload.uploadedAt,
        }));

        res.status(200).json({
            success: true,
            data: filesInfo,
        });
    } catch (error) {
        next(error);
    }
};

export const addFile = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Verify authentication
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
            return;
        }

        if (!req.file) {
            res.status(400).json({
                success: false,
                message: 'Aucun fichier fourni',
            });
            return;
        }

        // Save to MongoDB
        const uploadId = await createUpload({
            userId: req.user.userId,
            originalName: req.file.originalname,
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype,
            uploadedAt: new Date(),
            filePath: req.file.path,
            processingStatus: 'pending',
        });

        // Trigger automatic snapshot processing
        try {
            const snapshotResult = await processUpload(
                req.file.path,
                req.user.userId,
                uploadId,
                req.file.originalname,
                req.body.formatType, // Optional manual format
                req.body.snapshotDate // Optional manual date
            );

            // Update upload with processing results
            await updateUpload(uploadId, {
                formatType: snapshotResult.parseResult.metadata.formatType,
                formatDetectionConfidence: snapshotResult.detection?.confidence,
                snapshotDate: snapshotResult.snapshot.snapshotDate,
                processingStatus: 'processed',
            });

            // Invalidate all cache for this user
            await cacheService.delete(`snapshots:user:${req.user.userId}:*`);
            await cacheService.delete(`timeline:user:${req.user.userId}:*`);
            await cacheService.delete(`position:user:${req.user.userId}:*`);

            res.status(200).json({
                success: true,
                message: 'Fichier CSV téléchargé et analysé avec succès',
                data: {
                    uploadId: uploadId.toString(),
                    snapshotId: snapshotResult.snapshotId.toString(),
                    formatDetection: {
                        formatType: snapshotResult.parseResult.metadata.formatType,
                        bankName: snapshotResult.parseResult.metadata.bankName,
                        confidence: snapshotResult.detection?.confidence || 1,
                        autoDetected: !!snapshotResult.detection,
                    },
                    snapshot: {
                        snapshotDate: snapshotResult.snapshot.snapshotDate,
                        totalValue: snapshotResult.snapshot.totalValue,
                        positionCount: snapshotResult.snapshot.positions.length,
                        totalGainLoss: snapshotResult.snapshot.totalGainLoss,
                        totalGainLossPercentage: snapshotResult.snapshot.totalGainLossPercentage,
                    },
                    parseErrors: snapshotResult.parseResult.errors,
                    parseWarnings: snapshotResult.parseResult.warnings,
                },
            });
        } catch (processingError) {
            // Update upload status to failed
            await updateUpload(uploadId, {
                processingStatus: 'failed',
            });

            throw processingError;
        }
    } catch (error) {
        next(error);
    }
};

export const removeFile = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Verify authentication
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
            return;
        }

        const { filename } = req.body;

        if (!filename) {
            res.status(400).json({
                success: false,
                message: 'Nom de fichier requis',
            });
            return;
        }

        // Get upload to retrieve its ID for analysis deletion
        const upload = await getUploadByFilename(req.user.userId, filename);

        // Delete from MongoDB
        const deletedFromDB = await deleteUploadByFilename(req.user.userId, filename);

        if (!deletedFromDB) {
            res.status(404).json({
                success: false,
                message: 'Fichier introuvable dans la base de données',
            });
            return;
        }

        // Delete associated snapshot if upload was found
        if (upload?._id) {
            try {
                await deleteSnapshotByUploadId(upload._id.toString());
            } catch (error) {
                logger.error('Failed to delete snapshot', { uploadId: upload._id.toString(), error });
                // Continue - don't fail the file deletion
            }
        }

        // Construire le chemin du fichier
        const uploadDir = path.join(process.cwd(), 'uploads');
        const userDir = path.join(uploadDir, req.user.userId);
        const filePath = path.join(userDir, filename);

        // Delete from filesystem if exists
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);

            // Vérifier si le dossier utilisateur est vide et le supprimer si c'est le cas
            const filesInUserDir = fs.readdirSync(userDir);
            if (filesInUserDir.length === 0) {
                fs.rmdirSync(userDir);
            }
        }

        // Invalidate all cache for this user
        await cacheService.delete(`snapshots:user:${req.user.userId}:*`);
        await cacheService.delete(`timeline:user:${req.user.userId}:*`);
        await cacheService.delete(`position:user:${req.user.userId}:*`);

        res.status(200).json({
            success: true,
            message: `Fichier ${filename} supprimé avec succès`,
        });
    } catch (error) {
        next(error);
    }
};
