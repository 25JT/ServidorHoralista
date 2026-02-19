import { app } from "../config/Seccion.js"
import bd from "../config/Bd.js";
import { verificarSesion } from "../middleware/autenticacion.js"
import cloudinary from "../config/cloudinary.js";


app.delete("/api/tienda/catalogo/eliminar", verificarSesion, async (req, res) => {
    try {
        const { id } = req.body;
        const userid = req.session.userId;

        // 1. Verificar que el catálogo existe y pertenece al usuario
        const [pservicioRows] = await bd.query("select id from pservicio where id_usuario = ?", [userid]);
        if (pservicioRows.length === 0) {
            return res.status(404).json({ success: false, message: "No se encontró el comercio asociado (pservicio)" });
        }
        const id_pservicio = pservicioRows[0].id;

        const [catalogoRows] = await bd.query("select id from catalogos where id = ? and id_pservicio = ?", [id, id_pservicio]);
        if (catalogoRows.length === 0) {
            return res.status(404).json({ success: false, message: "El catálogo no existe o no tiene permisos para eliminarlo" });
        }

        // 2. Eliminar imágenes de Cloudinary (con manejo de errores para evitar 404 interrumpiendo el flujo)
        const prefix = `catalogo/servicios/${id}`;
        try {
            const resources = await cloudinary.api.resources({ type: "upload", prefix });
            const publicIds = resources.resources.map(r => r.public_id);

            if (publicIds.length > 0) {
                await cloudinary.api.delete_resources(publicIds);
            }

            // Intentar borrar la carpeta. Si no existe, delete_folder lanzará un error que capturamos.
            await cloudinary.api.delete_folder(prefix);
        } catch (cloudinaryError) {
            // Si es un 404 (no se encontró la carpeta/recurso), simplemente lo ignoramos y seguimos
            // ya que el objetivo es que no exista.
            if (cloudinaryError.http_code !== 404) {
                console.warn("Aviso: Error no crítico al limpiar Cloudinary:", cloudinaryError.message);
            }
        }

        // 3. Eliminar del catálogo en la base de datos
        await bd.query("delete from catalogos where id = ?", [id]);

        res.status(200).json({ success: true, message: "Catálogo eliminado correctamente" });
    } catch (error) {
        console.error("Error al eliminar el catálogo:", error);
        res.status(500).json({ success: false, message: "Error interno al procesar la solicitud" });
    }
});
