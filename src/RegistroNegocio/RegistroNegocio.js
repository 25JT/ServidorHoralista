
import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";
import { verificarSesion } from "../middleware/autenticacion.js";
import upload from "../config/multer.js";
import cloudinary from "../config/cloudinary.js";

//registro negocio
// ✅ Protegido con middleware de autenticación
app.post("/registroNegocio", verificarSesion, upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'banner', maxCount: 1 }
]), async (req, res) => {
    try {
        const {
            nombre_establecimiento,
            telefono_establecimiento,
            direccion,
            hora_inicio,
            hora_fin,
            dias_trabajo,
            tipo_servicio,
            precio,
            intervaloCitas, // Recibe intervaloCitas desde el frontend
            descripcion
        } = req.body;

        const userid = req.session.userId;

        if (!userid) {
            return res.status(400).json({
                success: false,
                message: "El ID del usuario es requerido",
            });
        }

        // Upload images to Cloudinary if they exist
        let logoUrl = null;
        let bannerUrl = null;

        if (req.files) {
            if (req.files['logo']) {
                const logoFile = req.files['logo'][0];
                const uploadResult = await new Promise((resolve, reject) => {
                    cloudinary.uploader.upload_stream({ folder: 'negocios/logos' }, (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }).end(logoFile.buffer);
                });
                logoUrl = uploadResult.secure_url;
            }

            if (req.files['banner']) {
                const bannerFile = req.files['banner'][0];
                const uploadResult = await new Promise((resolve, reject) => {
                    cloudinary.uploader.upload_stream({ folder: 'negocios/banners' }, (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }).end(bannerFile.buffer);
                });
                bannerUrl = uploadResult.secure_url;
            }
        }

        // Convertir a string si se recibe como array
        const dias = Array.isArray(dias_trabajo)
            ? dias_trabajo.join(",")
            : typeof dias_trabajo === "string"
                ? dias_trabajo
                : null;

        const [result] = await bd.execute(
            `INSERT INTO pservicio 
              (id, id_usuario, nombre_establecimiento, telefono_establecimiento, direccion, hora_inicio, hora_fin, dias_trabajo, negocio_creado, Servicio, Precio, intervaloCitas, descripcion, logo, banner, created_at, updated_at) 
             VALUES 
              (UUID(), ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                userid,
                nombre_establecimiento || null,
                telefono_establecimiento || null,
                direccion || null,
                hora_inicio || null,
                hora_fin || null,
                dias || null,
                tipo_servicio || null,
                precio || null,
                intervaloCitas || null, // Asegurar que duracion/intervalo no sea undefined
                descripcion || null,
                logoUrl || null,
                bannerUrl || null
            ]
        );

        res.json({
            success: true,
            message: "Negocio registrado exitosamente",
            data: result,
        });

    } catch (error) {
        console.error("Error al registrar el negocio:", error);
        res.status(500).json({
            success: false,
            message: "Error al registrar el negocio",
            error: error.message,
        });
    }
});
