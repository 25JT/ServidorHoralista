import { app, io } from "../config/Seccion.js";
import bd from "../config/Bd.js";
import { v4 as uuidv4 } from 'uuid';
import { verificarSesion } from "../middleware/autenticacion.js";




app.put("/api/Reservas/actualizarEstado", verificarSesion, async (req, res) => {
    try {
        // Eliminamos const io = req.app.get("io"); para asegurar usar el io importado globalmente.
        const userId = req.session.userId;
        const [idNegocio] = await bd.query("select id from  pservicio where id_usuario = ? ;", [userId]);
        const [cita] = await bd.query("select estado from  agenda where id = ? and id_usuario_cliente = ? ;", [req.body.agenda_id, req.body.usuario_id]);

        if (cita.length === 0) {
            return res.status(404).json({ message: "Cita no encontrada" });
        }

        console.log("Estado actual:", cita[0].estado);
        console.log("Cuerpo de la petición:", req.body);

        if ((cita[0].estado === "pendiente" || cita[0].estado === "0") && req.body.nuevoEstado === "completada") {
            const id = uuidv4();
            await bd.query("update agenda set estado = 'completada' where id = ? and id_usuario_cliente = ? ;", [req.body.agenda_id, req.body.usuario_id]);
            const [calificacion] = await bd.query("select id_usuario from calificacion where id_usuario = ? ;", [req.body.usuario_id]);
            if (calificacion.length === 0) {
                await bd.query("insert into calificacion (id, id_pservicio, id_usuario, calificacion_mostrada , calificacion) values (?, ?, ?, 0, 0);", [id, idNegocio[0].id, req.body.usuario_id]);
            }
            console.log(`📢 [CitaEnCurso-DEBUG] Emitiendo 'completada'. NumClientes: ${io.engine.clientsCount}`);
            io.emit("actualizar_estado_citas", { estado: "completada", id_cita: req.body.agenda_id });
            return res.status(200).json({ message: "Cita completada" });
        }

        if (cita[0].estado === "pendiente" || cita[0].estado === "confirmada" || cita[0].estado === "0" || cita[0].estado === "1") {
            await bd.query("update agenda set estado = 'en curso' where id = ? and id_usuario_cliente = ? ;", [req.body.agenda_id, req.body.usuario_id]);
            console.log(`📢 [CitaEnCurso-DEBUG] Emitiendo 'en curso'. NumClientes: ${io.engine.clientsCount}`);
            io.emit("actualizar_estado_citas", { estado: "en curso", id_cita: req.body.agenda_id });
            return res.status(200).json({ message: "Cita en curso" });
        }

        if (cita[0].estado === "en curso") {
            const id = uuidv4();
            await bd.query("update agenda set estado = 'completada' where id = ? and id_usuario_cliente = ? ;", [req.body.agenda_id, req.body.usuario_id]);
            const [calificacion] = await bd.query("select id_usuario from calificacion where id_usuario = ? ;", [req.body.usuario_id]);
            if (calificacion.length === 0) {
                await bd.query("insert into calificacion (id, id_pservicio, id_usuario, calificacion_mostrada , calificacion) values (?, ?, ?, 0, 0);", [id, idNegocio[0].id, req.body.usuario_id]);
            }
            console.log(`📢 [CitaEnCurso-DEBUG] Emitiendo 'completada' (ya estaba en curso). NumClientes: ${io.engine.clientsCount}`);
            io.emit("actualizar_estado_citas", { estado: "completada", id_cita: req.body.agenda_id });
            return res.status(200).json({ message: "Cita finalizada" });
        }

        res.status(204).json({ message: "No hay contenido para Ti =( " });
    } catch (error) {
        console.error("Error en /api/Reservas/actualizarEstado: ", error);
        return res.status(500).json({ message: "Error al actualizar el estado de la cita" });
    }
});
