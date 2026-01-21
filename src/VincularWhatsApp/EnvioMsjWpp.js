import bd from "../config/Bd.js";
import { sessions } from "./VincularWpp.js";
import { RutaFront } from "../RutaFront/Ruta.js";





export default async function envioMsjWpp() {
    try {
        const [rows] = await bd.query(`
            SELECT 
                a.id,
                a.id_pservicio,
                DATE_FORMAT(a.fecha, '%d/%m/%Y') AS fecha,
                TIME_FORMAT(a.hora, '%H:%i') AS hora,
                u.nombre,
                u.telefono
            FROM horalista.agenda a
            INNER JOIN horalista.usuario u 
                ON a.id_usuario_cliente = u.id
            WHERE a.estado = 'pendiente'
              AND a.recordatorio_enviado = 0
              AND TIMESTAMP(a.fecha, a.hora)
                    BETWEEN NOW()
                        AND DATE_ADD(NOW(), INTERVAL 1 HOUR);
        `);

        if (rows.length === 0) return;

        for (const row of rows) {
            const { id, id_pservicio, nombre, telefono, fecha, hora } = row;

            // Validar si el negocio tiene sesión de WhatsApp activa
            if (sessions.has(id_pservicio)) {
                const sock = sessions.get(id_pservicio);

                if (sock.user) {
                    const link = `${RutaFront}/Confirmarcita?id=${id}`;
                    const mensaje =
                        `Hola *${nombre}* 👋

📅 *Cita programada*
🗓 Fecha: *${fecha}*
⏰ Hora: *${hora}*

👉 Por favor confirma tu asistencia tocando el siguiente enlace:

${link}

¡Gracias!`;


                    // Formatear número: quitar caracteres no numéricos y asegurar prefijo 57 si es necesario
                    let numeroLimpio = telefono.replace(/\D/g, "");
                    if (numeroLimpio.length === 10) {
                        numeroLimpio = "57" + numeroLimpio;
                    }
                    const numeroWpp = `${numeroLimpio}@s.whatsapp.net`;

                    console.log(`Attempting to send message to: ${numeroWpp}`);

                    try {
                        await sock.sendMessage(numeroWpp, { text: mensaje });

                        // Actualizar intentos a 0 y fecha_envio en registro_envios_wpp
                        await bd.query(`
                            UPDATE registro_envios_wpp 
                            SET intentos = 0, error = NULL, fecha_envio = NOW(), updated_at = NOW()
                            WHERE id_pservicio = ?
                        `, [id_pservicio]);

                        // Marcar recordatorio como enviado en la agenda
                        await bd.query(`
                            UPDATE agenda 
                            SET recordatorio_enviado = 1, recordatorio_enviado_at = NOW() 
                            WHERE id = ?
                        `, [id]);

                        console.log(`✅ Mensaje enviado a ${nombre} (${telefono}) para el negocio ${id_pservicio}`);
                    } catch (errorEnvio) {
                        console.error(`❌ [ERROR CRÍTICO] Fallo al enviar mensaje a ${nombre} (${telefono}):`, errorEnvio.message);

                        // Actualizar error e intentos en registro_envios_wpp
                        await bd.query(`
                            UPDATE registro_envios_wpp 
                            SET intentos = intentos + 1, error = ?, fecha_envio = NOW(), updated_at = NOW()
                            WHERE id_pservicio = ?
                        `, [errorEnvio.message, id_pservicio]);
                    }
                } else {
                    console.log(`⚠️ La sesión del negocio ${id_pservicio} existe pero no está autenticada (sock.user is null).`);
                }
            } else {
                console.log(`⚠️ Negocio ${id_pservicio} no tiene sesión de WhatsApp activa en el Map de sesiones.`);
            }
        }
    } catch (error) {
        console.error("Error crítico en envioMsjWpp:", error);
    }
}

