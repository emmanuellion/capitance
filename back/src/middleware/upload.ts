import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { validateCsvMimeType, validateCsvExtension, validateFileSize } from '../utils/csvSecurity.js';

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Créer le dossier uploads s'il n'existe pas
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configuration du stockage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Créer un dossier par utilisateur basé sur l'user authentifié
        const userId = (req as any).user?.userId || 'default';
        const userDir = path.join(UPLOAD_DIR, userId);

        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }

        cb(null, userDir);
    },
    filename: (req, file, cb) => {
        // Générer un nom de fichier unique avec timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        // Sanitize original filename to prevent path traversal
        const sanitizedOriginalName = path.basename(file.originalname);
        const ext = path.extname(sanitizedOriginalName);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
});

// Filtre pour accepter uniquement les fichiers CSV avec validation stricte
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Validate extension
    if (!validateCsvExtension(file.originalname)) {
        return cb(new Error('Seuls les fichiers CSV sont acceptés (extension .csv requise)'));
    }

    // Validate MIME type
    if (!validateCsvMimeType(file.mimetype)) {
        return cb(new Error(`Type MIME invalide: ${file.mimetype}. Seuls les fichiers CSV sont acceptés`));
    }

    // Validate filename for path traversal attempts
    const basename = path.basename(file.originalname);
    if (basename !== file.originalname || file.originalname.includes('..')) {
        return cb(new Error('Nom de fichier invalide détecté'));
    }

    cb(null, true);
};

// Configuration de multer
export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1, // Only one file at a time
        fields: 10, // Limit form fields
        parts: 20, // Limit total parts
    },
});
