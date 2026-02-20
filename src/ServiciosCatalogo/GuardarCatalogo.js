import { app } from "../config/Seccion.js"
import bd from "../config/Bd.js";
import { verificarAutenticacionYPropietario } from "../middleware/autenticacion.js"
import upload from "../config/multer.js";
import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";
import { v4 as uuidv4 } from 'uuid';

/**
 * Función helper para extraer el public_id de una URL de Cloudinary
 */
const obtenerPublicId = (url) => {
    if (!url) return null;
    const partes = url.split("/upload/");
    if (partes.length < 2) return null;

    let publicIdConExtension = partes[1];
    const matchRegion = publicIdConExtension.match(/^v\d+\/(.+)$/);
    if (matchRegion) {
        publicIdConExtension = matchRegion[1];
    }

    return publicIdConExtension.split(".")[0];
};

/**
 * Función helper para borrar un recurso de Cloudinary
 */
const borrarDeCloudinary = async (url) => {
    const publicId = obtenerPublicId(url);
    if (publicId) {
        try {
            await cloudinary.uploader.destroy(publicId);
        } catch (error) {
            console.warn("Error no crítico al borrar imagen de Cloudinary:", error.message);
        }
    }
};

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
    { name: 'foto3', maxCount: 1 },
]), verificarAutenticacionYPropietario, async (req, res) => {
    try {



        console.log(req.body);
        const { idurl, nombre, descripcion, precio, duracion } = req.body;
        const userid = req.session.userId;

        // 1. Necesitamos el id_pservicio del usuario para cualquier operación
        const [pservicioRows] = await bd.query("select id from pservicio where id_usuario = ?", [userid]);
        if (pservicioRows.length === 0) {
            return res.status(404).json({ success: false, message: "No se encontró el comercio asociado" });
        }
        const id_pservicio = pservicioRows[0].id;

        // Validaciones básicas
        if (!nombre || !precio || !duracion || !descripcion) {
            return res.status(400).json({ success: false, message: "Todos los campos son obligatorios" });
        }



        // 2. Comprobación exacta solicitada para saber si existe o no
        const [catalogoRows] = await bd.query("select id, foto1, foto2, foto3 from catalogos where id = ? and id_pservicio = ?", [idurl, id_pservicio]);

        let id_catalogo;
        let isUpdate = false;
        let existingPhotos = { foto1: null, foto2: null, foto3: null };

        if (catalogoRows.length >= 1) {
            // Existe: es una actualización
            isUpdate = true;
            id_catalogo = idurl;
            existingPhotos = catalogoRows[0];
        } else {
            // Es 0 o no tiene idurl: es un nuevo catálogo
            isUpdate = false;
            id_catalogo = uuidv4();
        }

        let f1 = existingPhotos.foto1;
        let f2 = existingPhotos.foto2;
        let f3 = existingPhotos.foto3;

        // 3. Subir imágenes a Cloudinary (borrando las antiguas si cambian)
        if (req.files) {
            if (req.files['foto1']) {
                if (isUpdate && existingPhotos.foto1) await borrarDeCloudinary(existingPhotos.foto1);
                f1 = await subirACloudinary(req.files['foto1'][0].buffer, `catalogo/servicios/${id_catalogo}`);
            }
            if (req.files['foto2']) {
                if (isUpdate && existingPhotos.foto2) await borrarDeCloudinary(existingPhotos.foto2);
                f2 = await subirACloudinary(req.files['foto2'][0].buffer, `catalogo/servicios/${id_catalogo}`);
            }
            if (req.files['foto3']) {
                if (isUpdate && existingPhotos.foto3) await borrarDeCloudinary(existingPhotos.foto3);
                f3 = await subirACloudinary(req.files['foto3'][0].buffer, `catalogo/servicios/${id_catalogo}`);
            }
        }

        if (isUpdate) {
            // Actualización
            const updateQuery = `
                UPDATE catalogos 
                SET nombre_servicio = ?, precio = ?, duracion = ?, descripcion = ?, foto1 = ?, foto2 = ?, foto3 = ?
                WHERE id = ? AND id_pservicio = ?
            `;
            const updateParams = [nombre, precio, duracion, descripcion, f1, f2, f3, id_catalogo, id_pservicio];
            await bd.query(updateQuery, updateParams);
        } else {
            // Creación
            const insertQuery = `
                INSERT INTO catalogos 
                (id, id_pservicio, nombre_servicio, precio, duracion, descripcion, foto1, foto2, foto3, activo) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            `;
            const insertParams = [id_catalogo, id_pservicio, nombre, precio, duracion, descripcion, f1, f2, f3, 1];
            await bd.query(insertQuery, insertParams);
        }

        res.status(200).json({
            success: true,
            message: isUpdate ? "Servicio actualizado correctamente" : "Servicio guardado correctamente en el catálogo",
            id: id_catalogo,
            urls: { foto1: f1, foto2: f2, foto3: f3 }
        });


    } catch (error) {
        console.error("Error al guardar el servicio en el catálogo:", error);
        res.status(500).json({ success: false, message: "Error interno al procesar la solicitud" });
    }
});
