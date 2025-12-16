import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";
import createTransporter from "../config/correo.js";
//Canelar cita por el prestador de servicio
app.put("/api/Reservas/cancelar", async (req, res) => {
    try {
        const { Agid, Useid } = req.body;

        const [rows] = await bd.query("SELECT id, id_pservicio,id_usuario_cliente FROM agenda WHERE id = ?", [Agid]);
        if (rows.length === 0) {
            return res.json({ success: false, message: "Cita no encontrada" });
        }

        await bd.query("UPDATE agenda SET estado = 'cancelada' , recordatorio_enviado = 1 WHERE id = ?", [Agid]);
        res.json({ success: true, message: "Cita cancelada correctamente" });

        const [usuario] = await bd.query("SELECT nombre,correo FROM usuario WHERE id = ?", [Useid]);

        console.log(usuario);
        const mensaje = `Hola ${usuario[0].nombre}, tu cita ha sido cancelada por el prestador de servicios.`;

        // ✅ Crear el transporter primero
        const transporter = await createTransporter();

        await transporter.sendMail({
            from: process.env.correoUser,
            to: usuario[0].correo,
            subject: "Cita cancelada",
            text: mensaje,
            html: `
              <p>Hola <b>${usuario[0].nombre}</b>,</p>
              <p>Tu cita ha sido cancelada.</p>
              <p>Lo sentimos pero el prestador de servicio no estará disponible en ese momento.</p>
            `
        });


    } catch (error) {
        console.error("Error al cancelar la cita:", error);
        res.status(500).json({ success: false, message: "Error al cancelar la cita", error: error.message });
    }
})
