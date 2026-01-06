import { type Request, type Response, type NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

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

        // Construire le chemin du dossier utilisateur
        const uploadDir = path.join(process.cwd(), 'uploads');
        const userDir = path.join(uploadDir, id);

        // Vérifier si le dossier utilisateur existe
        if (!fs.existsSync(userDir)) {
            res.status(200).json({
                success: true,
                data: [],
                message: 'Aucun fichier trouvé pour cet utilisateur',
            });
            return;
        }

        // Lire tous les fichiers du dossier utilisateur
        const files = fs.readdirSync(userDir);
        const filesInfo = files.map((filename) => {
            const filePath = path.join(userDir, filename);
            const stats = fs.statSync(filePath);

            return {
                filename,
                size: stats.size,
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime,
            };
        });

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
        const { id } = req.params;

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

        const fileInfo = {
            id: id,
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
        const { id, filename } = req.params;

        if (!id || !filename) {
            res.status(400).json({
                success: false,
                message: 'ID utilisateur et nom de fichier requis',
            });
            return;
        }

        // Construire le chemin du fichier
        const uploadDir = path.join(process.cwd(), 'uploads');
        const userDir = path.join(uploadDir, id);
        const filePath = path.join(userDir, filename);

        // Vérifier que le fichier existe
        if (!fs.existsSync(filePath)) {
            res.status(404).json({
                success: false,
                message: 'Fichier introuvable',
            });
            return;
        }

        // Supprimer le fichier
        fs.unlinkSync(filePath);

        // Vérifier si le dossier utilisateur est vide et le supprimer si c'est le cas
        const filesInUserDir = fs.readdirSync(userDir);
        if (filesInUserDir.length === 0) {
            fs.rmdirSync(userDir);
        }

        res.status(200).json({
            success: true,
            message: `Fichier ${filename} supprimé avec succès`,
        });
    } catch (error) {
        next(error);
    }
};
