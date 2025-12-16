//agendar cita
import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";
import createTransporter from "../config/correo.js";
import { RutaFront } from "../RutaFront/Ruta.js";

app.post("/agendarcita", async (req, res) => {
    try {
        const { userid, id, fecha, hora, mensaje, correo, nombre_establecimiento, telefono_establecimiento, nombre, apellido, direccion } = req.body;

        if (!userid || !id || !fecha || !hora) {
            return res.status(400).json({ success: false, message: "Faltan datos requeridos" });
        }

        // 1️ Verificar horario del barbero
        const [servicioRows] = await bd.query(
            "SELECT hora_inicio, hora_fin, dias_trabajo FROM pservicio WHERE id = ?",
            [id]
        );

        if (servicioRows.length === 0) {
            return res.status(404).json({ success: false, message: "Servicio no encontrado" });
        }

        const { hora_inicio, hora_fin, dias_trabajo } = servicioRows[0];

        const [anio, mes, dia] = fecha.split("-");
        const diaSemana = new Date(anio, mes - 1, dia)
            .toLocaleString("es-ES", { weekday: "long" })
            .toLowerCase();

        if (!dias_trabajo.toLowerCase().includes(diaSemana)) {
            return res.json({
                success: false,
                fechaDisponible: false,
                message: `El ${diaSemana} no está disponible. Días disponibles: ${dias_trabajo}`
            });
        }

        if (hora < hora_inicio || hora > hora_fin) {
            return res.json({
                success: false,
                horaDisponible: false,
                message: `Fuera del horario de trabajo. El horario disponible es de ${hora_inicio} a ${hora_fin}`,
                rango: { hora_inicio, hora_fin }
            });
        }

        // 2️ Verificar si ya hay cita en esa hora exacta
        const [ocupadaRows] = await bd.query(
            "SELECT 1 FROM agenda WHERE id_pservicio = ? AND fecha = ? AND hora = ? AND estado IN ('pendiente','confirmada')",
            [id, fecha, hora]
        );

        if (ocupadaRows.length > 0) {
            return res.json({ success: false, horaDisponible: false, message: "La hora ya está ocupada" });
        }

        // 3️ Verificar diferencia mínima de 1 hora con otras citas
        const [otrasCitasRows] = await bd.query(
            "SELECT hora FROM agenda WHERE id_pservicio = ? AND fecha = ? AND estado IN ('pendiente','confirmada')",
            [id, fecha]
        );

        const horaSeleccionada = new Date(`${fecha}T${hora}`);
        for (let cita of otrasCitasRows) {
            const horaExistente = new Date(`${fecha}T${cita.hora}`);
            const diferenciaHoras = Math.abs((horaSeleccionada - horaExistente) / (1000 * 60 * 60));
            if (diferenciaHoras < 1) {
                return res.json({
                    success: false,
                    horaDisponible: false,
                    message: "Debe haber al menos 1 hora entre citas"
                });
            }
        }

        // 4️ Insertar en agenda
        await bd.query(
            "INSERT INTO agenda (id, id_pservicio, id_usuario_cliente, fecha, hora, estado, notas) VALUES (UUID(), ?, ?, ?, ?, 'pendiente', ?)",
            [id, userid, fecha, hora, mensaje || ""]
        );

        // Envío de correo
        const link = `${RutaFront}/Confirmarcita?id=${id}`;
        const mensaje2 = `Gracias por agendar tu cita en ${nombre_establecimiento}`;

        // ✅ Corrección
        const transporter = await createTransporter();

        await transporter.sendMail({
            from: process.env.correoUser,
            to: correo,
            subject: `Tu cita ha sido agendada con éxito en ${nombre_establecimiento}`,
            text: mensaje2,
            html: `
    <p>Hola <b>${nombre} ${apellido}</b>,</p>
    <p>¡Gracias por confiar en <b>${nombre_establecimiento}</b>! 
    Hemos registrado tu cita para el <b>${fecha}</b> a las <b>${hora}</b>.</p>
    <p><b>Dirección:</b> ${direccion}</p>
    <p><b>Teléfono:</b> ${telefono_establecimiento}</p>
    <p>📌 Recuerda: una hora antes de tu cita recibirás un correo recordatorio para confirmar tu asistencia.</p>
    <p>❌ Si no puedes asistir, cancela la cita desde el menú de tus citas.</p>
    <p>¡Te esperamos!<br><b>${nombre_establecimiento}</b></p>
  `,
        });

        res.json({
            success: true,
            fechaDisponible: true,
            horaDisponible: true,
            message: "Cita agendada correctamente"
        });
        return;

    } catch (error) {
        console.error("Error al agendar cita:", error);
        res.status(500).json({ success: false, message: "Error interno", error: error.message });
    }
});