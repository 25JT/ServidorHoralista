//agendar cita
import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";
import createTransporter from "../config/correo.js";
import { PrimaryRuta } from "../RutaFront/Ruta.js";
import { verificarSesion } from "../middleware/autenticacion.js";
import { sessions } from "../VincularWhatsApp/VincularWpp.js";

// ✅ Protegido con verificarSesion
app.post("/agendarcita", verificarSesion, async (req, res) => {
    try {
        // ✅ Usar el userId de la sesión (fuente de verdad)
        const userid = req.session.userId;
        const { id, id_catalogo, fecha, hora, mensaje, correo, nombre_establecimiento, telefono_establecimiento, nombre, apellido, direccion, esFechaEspecial } = req.body;

        if (!id || !fecha || !hora) {
            return res.status(400).json({ success: false, message: "Faltan datos requeridos" });
        }

        // 1️ Verificar horario del barbero
        const [servicioRows] = await bd.query(
            "SELECT hora_inicio, hora_fin, dias_trabajo, intervaloCitas FROM pservicio WHERE id = ?",
            [id]
        );

        if (servicioRows.length === 0) {
            return res.status(404).json({ success: false, message: "Servicio no encontrado" });
        }

        const { hora_inicio, hora_fin, dias_trabajo, intervaloCitas } = servicioRows[0];
        let duracionServicio = intervaloCitas || 60;

        // 1.1 Si hay id_catalogo válido, obtener su duración específica para este establecimiento
        if (id_catalogo && id_catalogo !== "null") {
            const [catalogo] = await bd.query(
                "SELECT duracion FROM catalogos WHERE id = ? AND id_pservicio = ?",
                [id_catalogo, id]
            );
            if (catalogo.length > 0 && catalogo[0].duracion) {
                duracionServicio = parseInt(catalogo[0].duracion);
            } else {
                // Si el id_catalogo no pertenece a este establecimiento, no lo enviamos al INSERT
                req.body.id_catalogo = null;
            }
        }

        // 1.2 Si no es una fecha especial (laborable), validar contra el horario general y días de trabajo
        if (esFechaEspecial !== 1) {
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
        }

        // 2️ Verificar límites de capacidad y solapamientos

        // 2.1 Obtener capacidad especial si existe
        const [espRows] = await bd.query(
            "SELECT hora_inicio, hora_fin, total_citas FROM pservicio_capacidad_dia WHERE id_pservicio = ? AND fecha = ? AND activo = 1",
            [id, fecha]
        );
        const esp = espRows[0];

        // 2.2 Obtener todas las citas del día para verificar solapamientos y conteo
        const [otrasCitasRows] = await bd.query(
            `SELECT a.hora, c.duracion 
             FROM agenda a 
             LEFT JOIN catalogos c ON a.id_catalogo = c.id
             WHERE a.id_pservicio = ? AND a.fecha = ? AND a.estado IN ('pendiente','confirmada','reservada', '0', '1')`,
            [id, fecha]
        );

        const parseToMinutes = (timeStr) => {
            if (!timeStr) return 0;
            const [h, m] = timeStr.split(':').map(Number);
            return h * 60 + (m || 0);
        };

        const nuevaCitaInicio = parseToMinutes(hora);
        const nuevaCitaFin = nuevaCitaInicio + duracionServicio;

        // A. Validar que no exceda la hora de cierre (especial o general)
        const horaCierreMin = esp ? parseToMinutes(esp.hora_fin) : parseToMinutes(hora_fin);
        if (nuevaCitaFin > horaCierreMin) {
            return res.json({
                success: false,
                message: `La duración del servicio excede el horario de cierre (${esp ? esp.hora_fin : hora_fin})`
            });
        }

        // B. Validar límite total de citas (si hay capacidad especial)
        if (esp && esp.total_citas > 0 && otrasCitasRows.length >= esp.total_citas) {
            return res.json({
                success: false,
                message: "Capacidad máxima de citas para este día alcanzada."
            });
        }

        // C. Verificar solapamientos de rango
        for (let cita of otrasCitasRows) {
            const existenteInicio = parseToMinutes(cita.hora);
            const existenteDuracion = cita.duracion ? parseInt(cita.duracion) : (intervaloCitas || 60);
            const existenteFin = existenteInicio + existenteDuracion;

            if (nuevaCitaInicio < existenteFin && nuevaCitaFin > existenteInicio) {
                return res.json({
                    success: false,
                    horaDisponible: false,
                    message: `El rango seleccionado se solapa con otra cita (${cita.hora})`
                });
            }
        }

        // 3️ Insertar en agenda
        await bd.query(
            "INSERT INTO agenda (id, id_pservicio, id_catalogo, id_usuario_cliente, fecha, hora, estado, notas) VALUES (UUID(), ?, ?, ?, ?, ?, 'pendiente', ?)",
            [id, id_catalogo || null, userid, fecha, hora, mensaje || ""]
        );

        // Envío de correo
        const origin = req.get('origin') || PrimaryRuta;
        const link = `${origin}/Confirmarcita?id=${id}`;
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

        // Envio de recordatorio por WhatsApp 
        const [telefonoUsuarioRows] = await bd.query(
            "SELECT telefono FROM usuario WHERE id = ?",
            [userid]
        );
        const [secionNegocioWppRows] = await bd.query(
            "SELECT id_socket FROM registro_envios_wpp WHERE id_pservicio = ?",
            [id]
        );

        if (secionNegocioWppRows.length > 0 && sessions.has(id)) {
            const sock = sessions.get(id);
            const telefono = telefonoUsuarioRows[0].telefono;

            if (sock.user && telefono) {
                const mensajeWpp = `Hola *${nombre} ${apellido}* 👋, tu cita para el *${fecha}* a las *${hora}* ha sido agendada con éxito en *${nombre_establecimiento}*. 

Recuerda que una hora antes de tu cita recibirás un correo recordatorio para confirmar tu asistencia. 

Si no puedes asistir, cancela la cita desde el menú de tus citas. ¡Te esperamos!`;

                // Formatear número: quitar caracteres no numéricos y asegurar prefijo 57 si es necesario
                let numeroLimpio = telefono.replace(/\D/g, "");
                if (numeroLimpio.length === 10) {
                    numeroLimpio = "57" + numeroLimpio;
                }
                const numeroWpp = `${numeroLimpio}@s.whatsapp.net`;

                try {
                    await sock.sendMessage(numeroWpp, { text: mensajeWpp });
                    console.log(`✅ Mensaje de WhatsApp enviado a ${nombre} (${telefono}) para el negocio ${id}`);
                } catch (errorWpp) {
                    console.error(`❌ Error al enviar mensaje de WhatsApp para el negocio ${id}:`, errorWpp.message);
                }
            } else {
                console.log(`⚠️ No se pudo enviar WhatsApp: Sesión de negocio ${id} no autenticada o teléfono de usuario no encontrado.`);
            }
        } else {
            console.log(`⚠️ Negocio ${id} no tiene sesión de WhatsApp activa.`);
        }




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