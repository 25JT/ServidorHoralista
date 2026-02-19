import { app } from "../config/Seccion.js"
import bd from "../config/Bd.js";
import { verificarAutenticacionYPropietario } from "../middleware/autenticacion.js"
import upload from "../config/multer.js";
import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";
import { v4 as uuidv4 } from 'uuid';

/**
 * Función helper para subir un buffer a Cloudinary con compresión
 */
const subirACloudinary = (buffer, folder) => {
    return new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                resource_type: "image",
                quality: "auto",
                fetch_format: "auto",
            },
            (error, result) => {
                if (result) {
                    resolve(result.secure_url);
                } else {
                    reject(error);
                }
            }
        );
        Readable.from(buffer).pipe(stream);
    });
};

app.post("/api/tienda/catalogo/guardar", upload.fields([
    { name: 'foto1', maxCount: 1 },
    { name: 'foto2', maxCount: 1 },
    { name: 'foto3', maxCount: 1 }
]), verificarAutenticacionYPropietario, async (req, res) => {
    try {
        const { nombre, descripcion, precio, duracion } = req.body;

        const userid = req.session.userId;

        // IMPORTANTE: bd.query devuelve [filas, campos]. Debemos desestructurar para obtener solo las filas.
        const [pservicioRows] = await bd.query("select id from pservicio where id_usuario = ?", [userid]);

        if (pservicioRows.length === 0) {
            return res.status(404).json({ success: false, message: "No se encontró el comercio asociado (pservicio)" });
        }

        const id_pservicio = pservicioRows[0].id;

        // Validaciones básicas
        if (!nombre || !precio || !duracion || !descripcion) {
            return res.status(400).json({ success: false, message: "Todos los campos son obligatorios" });
        }

        const id_catalogo = uuidv4();
        let f1 = null, f2 = null, f3 = null;

        // Subir imágenes a Cloudinary si existen
        if (req.files) {
            if (req.files['foto1']) f1 = await subirACloudinary(req.files['foto1'][0].buffer, `catalogo/servicios/${id_catalogo}`);
            if (req.files['foto2']) f2 = await subirACloudinary(req.files['foto2'][0].buffer, `catalogo/servicios/${id_catalogo}`);
            if (req.files['foto3']) f3 = await subirACloudinary(req.files['foto3'][0].buffer, `catalogo/servicios/${id_catalogo}`);
        }

        const query = `
            INSERT INTO catalogos 
            (id, id_pservicio, nombre_servicio, precio, duracion, descripcion, foto1, foto2, foto3, activo) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `;

        const params = [
            id_catalogo,
            id_pservicio, // Pasamos el string, no el array completo de la consulta
            nombre,
            precio,
            duracion,
            descripcion,
            f1, f2, f3,
            1 // activo por defecto
        ];

        await bd.query(query, params);

        res.status(200).json({
            success: true,
            message: "Servicio guardado correctamente en el catálogo",
            id: id_catalogo,
            urls: { foto1: f1, foto2: f2, foto3: f3 }
        });


    } catch (error) {
        console.error("Error al guardar el servicio en el catálogo:", error);
        res.status(500).json({ success: false, message: "Error interno al procesar la solicitud" });
    }
});
