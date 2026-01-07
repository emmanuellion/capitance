import { type Request, type Response, type NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { createUpload, getUploadsByUserId, deleteUploadByFilename } from '../models/Upload.js';

export const getFile = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;

        if (!id) {
            res.status(400).json({
                success: false,
                message: 'ID utilisateur requis',
            });
            return;
        }

        // Retrieve all uploads for this user from MongoDB
        const uploads = await getUploadsByUserId(id);

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
        const { id } = req.body;

        if (!req.file) {
            res.status(400).json({
                success: false,
                message: 'Aucun fichier fourni',
            });
            return;
        }

        if (!id) {
            res.status(400).json({
                success: false,
                message: 'Id manquant',
            });
            return;
        }

        // Save to MongoDB
        const uploadId = await createUpload({
            userId: id,
            originalName: req.file.originalname,
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype,
            uploadedAt: new Date(),
            filePath: req.file.path,
        });

        const fileInfo = {
            id: uploadId.toString(),
            userId: id,
            originalName: req.file.originalname,
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype,
        };

        res.status(200).json({
            success: true,
            message: 'Fichier CSV téléchargé avec succès',
            data: fileInfo,
        });
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
        const { id, filename } = req.body;

        if (!id || !filename) {
            res.status(400).json({
                success: false,
                message: 'ID utilisateur et nom de fichier requis',
            });
            return;
        }

        // Delete from MongoDB
        const deletedFromDB = await deleteUploadByFilename(id, filename);

        if (!deletedFromDB) {
            res.status(404).json({
                success: false,
                message: 'Fichier introuvable dans la base de données',
            });
            return;
        }

        // Construire le chemin du fichier
        const uploadDir = path.join(process.cwd(), 'uploads');
        const userDir = path.join(uploadDir, id);
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

        res.status(200).json({
            success: true,
            message: `Fichier ${filename} supprimé avec succès`,
        });
    } catch (error) {
        next(error);
    }
};
