import multer from 'multer';

// Configuramos Multer para guardar los archivos en memoria
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // Límite de 5MB por imagen
    },
    fileFilter: (req, file, cb) => {
        // Solo aceptamos imágenes
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes'), false);
        }
    }
});

export default upload;
