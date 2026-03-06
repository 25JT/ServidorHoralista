import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";
import { verificarSesion } from "../middleware/autenticacion.js";
app.post("/api/notificaciones/validar", verificarSesion, async (req, res) => {

    try {
        const useridFront = req.body.id;
        const userId = req.session.userId;


        if (useridFront !== userId) {
            return res.status(401).json({ message: "No autorizado" });
        }
        const [notificaciones] = await bd.query("select id, calificacion_mostrada  from calificacion where id_usuario = ?", [userId]);
        let id = notificaciones[0].id;
        req.session.id_notificacion = id;
        if (notificaciones[0].calificacion_mostrada > 0) {
            return res.status(200).json({ id: notificaciones[0].id, calificacion_mostrada: notificaciones[0].calificacion_mostrada, });
        } else {
            return res.status(200).json({ id: notificaciones[0].id, calificacion_mostrada: notificaciones[0].calificacion_mostrada, });
        }
    } catch (error) {
        console.error("Error en api/notificaciones/validar: ", error);
        return res.status(500).json({ message: "Error al validar notificaciones" });
    }
});

