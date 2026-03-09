import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";
import { v4 as uuidv4 } from 'uuid';
import { verificarSesion } from "../middleware/autenticacion.js";




app.put("/api/Reservas/actualizarEstado", verificarSesion, async (req, res) => {
    try {
        const userId = req.session.userId;
        const [idNegocio] = await bd.query("select id from  pservicio where id_usuario = ? ;", [userId]);
        const [cita] = await bd.query("select estado from  agenda where id = ? and id_usuario_cliente = ? ;", [req.body.agenda_id, req.body.usuario_id]);

        console.log(cita[0].estado);
        console.log(req.body);


        if (cita[0].estado === "pendiente" && req.body.nuevoEstado === "completada") {
            const id = uuidv4();
            await bd.query("update agenda set estado = 'completada' where id = ? and id_usuario_cliente = ? ;", [req.body.agenda_id, req.body.usuario_id]);
            const [calificacion] = await bd.query("select id_usuario from calificacion where id_usuario = ? ;", [req.body.usuario_id]);
            if (calificacion.length === 0) {
                await bd.query("insert into calificacion (id, id_pservicio, id_usuario, calificacion_mostrada , calificacion) values (?, ?, ?, 0, 0);", [id, idNegocio[0].id, req.body.usuario_id]);
            }
            return res.status(200).json({ message: "Cita en completada" });

        }


        if (cita[0].estado === "pendiente") {
            await bd.query("update agenda set estado = 'en curso' where id = ? and id_usuario_cliente = ? ;", [req.body.agenda_id, req.body.usuario_id]);
            return res.status(200).json({ message: "Cita en curso" });

        }

        if (cita[0].estado === "confirmada") {
            await bd.query("update agenda set estado = 'en curso' where id = ? and id_usuario_cliente = ? ;", [req.body.agenda_id, req.body.usuario_id]);
            return res.status(200).json({ message: "Cita en curso" });

        }
        if (cita[0].estado === "en curso") {
            const id = uuidv4();
            await bd.query("update agenda set estado = 'completada' where id = ? and id_usuario_cliente = ? ;", [req.body.agenda_id, req.body.usuario_id]);
            const [calificacion] = await bd.query("select id_usuario from calificacion where id_usuario = ? ;", [req.body.usuario_id]);
            if (calificacion.length === 0) {
                await bd.query("insert into calificacion (id, id_pservicio, id_usuario, calificacion_mostrada , calificacion) values (?, ?, ?, 0, 0);", [id, idNegocio[0].id, req.body.usuario_id]);
            }
            return res.status(200).json({ message: "Cita finalizada" });
        }

        res.status(204).json({ message: "No hay cantenido para Ti =( " });
    } catch (error) {
        console.error("Error en /api/Reservas/actualizarEstado: ", error);
        return res.status(500).json({ message: "Error al obtener la cita en curso" });
    }
});