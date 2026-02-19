import { app } from "../config/Seccion.js"
import bd from "../config/Bd.js";
import { verificarSesion } from "../middleware/autenticacion.js"


app.get("/api/tienda/catalogo/obtener", verificarSesion, async (req, res) => {
    try {
        const userid = req.session.userId;

        const [pservicioRows] = await bd.query("select id from pservicio where id_usuario = ?", [userid]);

        if (pservicioRows.length === 0) {
            return res.status(404).json({ success: false, message: "No se encontró el comercio asociado (pservicio)" });
        }

        const id_pservicio = pservicioRows[0].id;

        const [catalogoRows] = await bd.query("select id, nombre_servicio, precio,duracion,foto1 from catalogos where id_pservicio = ?", [id_pservicio]);

        res.status(200).json({ success: true, catalogo: catalogoRows });
    } catch (error) {
        console.error("Error al obtener el catálogo:", error);
        res.status(500).json({ success: false, message: "Error interno al procesar la solicitud" });
    }
});
