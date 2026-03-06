import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";
import { verificarSesion, verificarNotificacion } from "../middleware/autenticacion.js";

app.post("/api/Calificar/notificacion", verificarSesion, verificarNotificacion, async (req, res) => {
    try {
        const calificacion = req.body.rating;
        const userId = req.session.userId;
        const id_notificacion = req.session.id_notificacion;
        const [notificaciones] = await bd.query("select calificacion_mostrada, calificacion from calificacion where id = ?", [id_notificacion]);
        if (notificaciones.length > 0) {
            await bd.query("update calificacion set calificacion = ?, calificacion_mostrada = 1 where id_usuario = ?", [calificacion, userId]);
            return res.status(200).json({ message: "Calificacion actualizada" });
        } else {
            res.status(200).json({ message: "no existe la id " })

            return
        }

    } catch (error) {
        console.error("Error en /api/notificaciones/calificar: ", error);
        return res.status(500).json({ message: "Error al calificar" });
    }
});