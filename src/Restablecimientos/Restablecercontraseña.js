import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";
import { RutaFront } from "../RutaFront/Ruta.js";
import crypto from "crypto";
import createTransporter from "../config/correo.js";



//restablecer contraseña 
app.post("/restablecer-contrasena", async (req, res) => {
    const { correo } = req.body;
    console.log(req.body);

    try {
        const [rows] = await bd.execute(
            "SELECT  correo, id FROM usuario WHERE correo = ?",
            [correo]
        );

        if (rows.length === 0) {
            return res.status(400).json({ success: false, message: "Usuario no encontrado" });
        }

        const usuario = rows[0];

        const tokenId = crypto.randomUUID();
        const expiracion = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

        await bd.execute(
            "INSERT INTO token (id, id_usuario, tipo, usado, expiracion) VALUES (?, ?, 'reset_pass', 0, ?)",
            [tokenId, usuario.id, expiracion]
        );

        const linkRestablecimiento = `${RutaFront}/restablecer-contrasena?id_token=${tokenId}`;

        const mailOptions = {
            from: process.env.correoUser,
            to: correo,
            subject: "Restablecimiento de contraseña - HORA LISTA",
            html: `
              <h1>Restablecimiento de contraseña</h1>
              <p>Has solicitado restablecer tu contraseña. Por favor, haz clic en el siguiente enlace:</p>
              <a href="${linkRestablecimiento}" style="color: #ffffff; background-color: #007bff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Restablecer contraseña</a>
              <p>Si no solicitaste este restablecimiento, ignora este mensaje.</p>
            `
        };

        // ✅ crear el transporter primero
        const transporter = await createTransporter();
        await transporter.sendMail(mailOptions);

        return res.json({ success: true, message: "Correo de restablecimiento enviado" });

    } catch (error) {
        console.error("Error al restablecer contraseña:", error);
        return res.status(500).json({ success: false, message: "Error al restablecer contraseña" });
    }
});
