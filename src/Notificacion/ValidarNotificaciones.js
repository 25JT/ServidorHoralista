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
        const [notificaciones] = await bd.query(`
            SELECT 
                c.id, 
                c.calificacion_mostrada,
                p.nombre_establecimiento,
                (
                    SELECT IFNULL(cat.nombre_servicio, 'servicio basico')
                    FROM agenda a
                    LEFT JOIN catalogos cat ON a.id_catalogo = cat.id
                    WHERE a.id_usuario_cliente = c.id_usuario 
                      AND a.id_pservicio = c.id_pservicio 
                      AND a.estado = 'completada'
                    ORDER BY a.updated_at DESC
                    LIMIT 1
                ) AS nombre_servicio
            FROM calificacion c
            JOIN pservicio p ON c.id_pservicio = p.id
            WHERE c.id_usuario = ?
            AND c.calificacion_mostrada = 0
            LIMIT 1;
        `, [userId]);

        if (notificaciones.length === 0) {
            return res.status(204).json({ message: "Sin notificaciones pendientes" });
        }

        const notificacion = notificaciones[0];
        req.session.id_notificacion = notificacion.id;

        return res.status(200).json({
            id: notificacion.id,
            calificacion_mostrada: notificacion.calificacion_mostrada,
            nombre_establecimiento: notificacion.nombre_establecimiento,
            nombre_servicio: notificacion.nombre_servicio
        });
    } catch (error) {
        console.error("Error en api/notificaciones/validar: ", error);
        return res.status(500).json({ message: "Error al validar notificaciones" });
    }
});

