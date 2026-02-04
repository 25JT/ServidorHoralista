import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";
import { verificarSesion } from "../middleware/autenticacion.js";
import { v4 as uuidv4 } from 'uuid';

app.post("/api/actualizarCapacidadDia", verificarSesion, async (req, res) => {
    const idserver = req.session.userId;
    const id = uuidv4();
    console.log(String("cliente id:" + req.body.id_usuario));
    console.log(String("servidor id:" + idserver));
    if (String(idserver) !== String(req.body.id_usuario)) {



        res.json({
            success: false,
            status: 401,
            message: "No cambies tu id de usuario",
        })

        return;
    }

    try {
        const idPservicio = await bd.execute(
            `select id from pservicio where id_usuario = ?;`,
            [idserver]
        );

        const { fecha, total_citas, franja, hora_inicio, hora_fin, activo } = req.body;

        // Si total_citas es 0, lo enviamos como null para ignorar la capacidad total
        const totalCitasFinal = Number(total_citas) === 0 ? null : total_citas;

        // Comprobación para que la fecha no sea un día anterior al actual
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const fechaIngresada = new Date(fecha);
        fechaIngresada.setMinutes(fechaIngresada.getMinutes() + fechaIngresada.getTimezoneOffset()); // Ajustar a UTC para comparar solo la fecha

        console.log("total citas ✔️", totalCitasFinal);

        if (fechaIngresada < hoy) {
            res.status(400).json({
                success: false,
                status: 400,
                message: "No puedes establecer una capacidad para un día anterior al actual",
            });
            return;
        }

        const [existente] = await bd.execute(
            `SELECT id FROM pservicio_capacidad_dia WHERE id_usuario = ? AND fecha = ?`,
            [idserver, fecha]
        );

        if (existente.length > 0) {
            // Si ya existe, actualizamos el registro existente
            await bd.execute(
                `UPDATE pservicio_capacidad_dia 
                 SET total_citas = ?, franja = ?, hora_inicio = ?, hora_fin = ?, activo = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id_usuario = ? AND fecha = ?`,
                [totalCitasFinal, franja, hora_inicio, hora_fin, activo, idserver, fecha]
            );
        } else {
            // Si no existe, insertamos uno nuevo
            await bd.execute(
                `INSERT INTO pservicio_capacidad_dia (id, id_pservicio, id_usuario, fecha, total_citas, franja, hora_inicio, hora_fin, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                [id, idPservicio[0][0].id, idserver, fecha, totalCitasFinal, franja, hora_inicio, hora_fin, activo]
            );
        }

        res.status(200).json({
            success: true,
            status: 200,
            message: "Capacidad del dia actualizada correctamente",
        })


    } catch (error) {
        console.error("Error al actualizar la capacidad del dia:", error);
        res.status(500).json({
            success: false,
            status: 500,
            message: "Error al actualizar la capacidad del dia",
            error: error.message,
        })
    }



})
