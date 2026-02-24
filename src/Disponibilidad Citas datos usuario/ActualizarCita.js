import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";
import createTransporter from "../config/correo.js";
import { verificarSesion } from "../middleware/autenticacion.js";

app.post("/actCita", verificarSesion, async (req, res) => {
    const citaId = req.body.citaId;
    const hora = req.body.hora;
    const fecha = req.body.fecha;
    const correo = req.body.correo;
    const nombre = req.body.nombre;
    const nombre_establecimiento = req.body.nombre_establecimiento;
    const mensaje = req.body.mensaje;

    console.log(req.body);

    try {
        const id_catalogo = req.body.id_catalogo;

        await bd.execute(
            `UPDATE agenda 
            SET fecha = ?, hora = ? , notas = ?, id_catalogo = COALESCE(?, id_catalogo)
            WHERE id = ?`,
            [fecha, hora, mensaje, id_catalogo || null, citaId]
        );

        Actualizarcita(correo, nombre, nombre_establecimiento, fecha, hora);
        res.json({
            status: 200,

            success: true,
            message: "Cita actualizada correctamente",
        });
    } catch (error) {
        console.error("Error al actualizar la cita:", error);
        res.status(500).json({
            status: 500,
            success: false,
            message: "Error al actualizar la cita",
            error: error.message,
        });
    }

});

async function Actualizarcita(correo, nombre, nombre_establecimiento, fecha, hora) {
    try {
        const transporter = await createTransporter();
        const mailOptions = {
            from: process.env.correoUser,
            to: correo,
            subject: `Hola ${nombre} tu cita ha sido actualizada`,
            text: `Su cita ha sido actualizada correctamente
            Nombre del establecimiento: ${nombre_establecimiento}
            Fecha: ${fecha}
            Hora: ${hora}`,
        };
        await transporter.sendMail(mailOptions);
        console.log("Correo enviado correctamente");
    } catch (error) {
        console.error("Error al enviar el correo o actualizar la cita internamente:", error);
    }
}
