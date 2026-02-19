import { app } from "../config/Seccion.js"
import bd from "../config/Bd.js";
import { verificarAutenticacionYPropietario } from "../middleware/autenticacion.js"
import upload from "../config/multer.js";
import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";

/**
 * Función helper para subir un buffer a Cloudinary con compresión
 */
const subirACloudinary = (buffer, folder) => {
    return new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                resource_type: "image",
                quality: "auto", // Compresión automática
                fetch_format: "auto", // Formato automático (webp, etc)
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


app.post("/api/tienda/identidad/guardar", upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'banner', maxCount: 1 }
]), verificarAutenticacionYPropietario, async (req, res) => {

    try {
        const { tituloTienda, direccionTienda, descripcionTienda } = req.body;
        const userid = req.session.userId;

        let logoUrl = null;
        let bannerUrl = null;

        // Subir logo si existe
        if (req.files && req.files['logo']) {
            logoUrl = await subirACloudinary(req.files['logo'][0].buffer, "identidad/logos");
        }


        // Subir banner si existe
        if (req.files && req.files['banner']) {
            bannerUrl = await subirACloudinary(req.files['banner'][0].buffer, "identidad/banners");
        }


        // Si no se enviaron archivos, mantenemos los valores actuales (o null si el query lo permite)
        // Pero basándonos en la petición, los guardamos como logo y banner.

        // Ejecutamos el update. Usamos COALESCE o simplemente pasamos los valores si vienen.
        // Si queremos actualizar solo lo que venga, podríamos armar el query dinámicamente,
        // pero para simplificar y cumplir con el requisito:

        const query = `
            UPDATE pservicio 
            SET nombre_establecimiento = ?, 
                direccion = ?, 
                descripcion = ?
                ${logoUrl ? ', logo = ?' : ''}
                ${bannerUrl ? ', banner = ?' : ''}
            WHERE id_usuario = ?;
        `;

        const params = [tituloTienda, direccionTienda, descripcionTienda];
        if (logoUrl) params.push(logoUrl);
        if (bannerUrl) params.push(bannerUrl);
        params.push(userid);

        const [rows] = await bd.query(query, params);

        res.status(200).json({
            success: true,
            message: "Identidad guardada con éxito",

        });

    } catch (error) {
        console.error("Error al guardar identidad:", error);
        res.status(500).json({ success: false, message: "Error al procesar la solicitud" });
    }
});