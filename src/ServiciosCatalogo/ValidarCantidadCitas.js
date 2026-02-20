import { app } from "../config/Seccion.js"
import bd from "../config/Bd.js";
import { verificarSesion } from "../middleware/autenticacion.js"


app.get('/api/tienda/catalogo/validarCantalogos', verificarSesion, async (req, res) => {
    try {
        const userid = req.session.userId;
        const [pservicioRows] = await bd.query("select id from pservicio where id_usuario = ?", [userid]);
        if (pservicioRows.length === 0) {
            return res.status(404).json({ success: false, message: "No se encontró el comercio asociado" });
        }
        const id_pservicio = pservicioRows[0].id;

        const [cantidadServicios] = await bd.query("select count(*) as cantidad from catalogos where id_pservicio = ?", [id_pservicio]);
        res.status(200).json({ success: true, cantidadServicios: cantidadServicios[0].cantidad });
    } catch (error) {
        console.error("Error al validar la cantidad de citas:", error);
        res.status(500).json({ success: false, message: "Error al validar la cantidad de citas" });
    }
})