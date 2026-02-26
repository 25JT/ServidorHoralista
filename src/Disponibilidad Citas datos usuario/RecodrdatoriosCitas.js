import bd from "../config/Bd.js";
import createTransporter from "../config/correo.js";
import { PrimaryRuta } from "../RutaFront/Ruta.js";
import cron from "node-cron";
import envioMsjWpp from "../VincularWhatsApp/EnvioMsjWpp.js";

// 📌 Recordatorios → cada 15 minutos en el segundo 0
cron.schedule("0 */15 * * * *", () => {
    console.log("⏰ Ejecutando recordatorio de citas...");
    recordatorioCitas();
    envioMsjWpp();

});
// =========================
//  1. Recordatorios de citas
// =========================
async function recordatorioCitas() {
    try {
        const [rows] = await bd.query(`
SELECT 
    a.id,
    DATE_FORMAT(a.fecha, '%d/%m/%Y') AS fecha,
    TIME_FORMAT(a.hora, '%H:%i') AS hora,
    u.nombre,
    u.correo
FROM horalista.agenda a
INNER JOIN horalista.usuario u 
    ON a.id_usuario_cliente = u.id
WHERE a.estado = 'pendiente'
  AND a.recordatorio_enviado = 0
  AND TIMESTAMP(a.fecha, a.hora)
        BETWEEN NOW()
            AND DATE_ADD(NOW(), INTERVAL 1 HOUR);
      `);



        for (let row of rows) {
            const { id, fecha, hora, nombre, correo } = row;
            const link = `${PrimaryRuta}/Confirmarcita?id=${id}`;

            const mensaje = `Hola ${nombre}, tienes una cita el ${fecha} a las ${hora}.
  Por favor confirma tu asistencia en el siguiente enlace: ${link}`;

            // ✅ Crear el transporter primero
            const transporter = await createTransporter();

            await transporter.sendMail({
                from: process.env.correoUser,
                to: correo,
                subject: "Recordatorio de cita",
                text: mensaje,
                html: `<p>Hola <b>${nombre}</b>,</p>
                 <p>Tienes una cita el <b>${fecha}</b> a las <b>${hora}</b>.</p>
                 <p>Por favor confirma tu asistencia haciendo clic en el siguiente botón:</p>
                 <p><a href="${link}" style="background:#4CAF50;color:white;padding:10px 15px;text-decoration:none;border-radius:5px;">Confirmar cita</a></p>`
            });

            // Actualizar la agenda después de enviar
            await bd.query(
                `UPDATE agenda 
           SET recordatorio_enviado = 1, recordatorio_enviado_at = NOW() 
           WHERE id = ?`,
                [id]
            );
        }

        if (rows.length > 0) {
            console.log(`📩 Recordatorios enviados: ${rows.length}`);
        }

    } catch (error) {
        console.error("❌ Error en recordatorioCitas:", error);
    }
}