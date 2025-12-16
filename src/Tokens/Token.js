import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";
import { RutaFront } from "../RutaFront/Ruta.js";
import crypto from "crypto";
import createTransporter from "../config/correo.js";
import bcrypt from "bcrypt";

//funciones token con correo




app.post("/TokenRegistro", async (req, res) => {
    const { correo, id } = req.body;

    try {
        // 1️⃣ Generar token único
        const tokenId = crypto.randomUUID();
        const expiracion = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

        // 2️⃣ Guardar en tabla token (ajusta el valor de tipo según lo permitido en tu tabla)
        await bd.query(
            `INSERT INTO token (id, id_usuario, tipo, usado, expiracion) VALUES (?, ?, 'activate_account', 0, ?)`,
            [tokenId, id, expiracion]
        );

        // 3️⃣ Preparar link de verificación
        const linkVerificacion = `${RutaFront}/verificar-email?id_token=${tokenId}`;

        // 4️⃣ Configurar correo
        const mailOptions = {
            from: process.env.correoUser,
            to: correo,
            subject: "Verifica tu correo - HORA LISTA",
            html: `
                <h1>Bienvenido a HORA LISTA</h1>
                <p>Gracias por registrarte. Por favor, verifica tu correo haciendo clic en el siguiente enlace:</p>
                <a href="${linkVerificacion}" style="color: #ffffff; background-color: #007bff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verificar mi cuenta</a>
                <p>Si no te registraste, ignora este mensaje.</p>
            `
        };

        // Envía el correo aquí (tu lógica actual)
        const transporter = await createTransporter();
        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: "Por favor revisa tu correo para verificar tu cuenta" });
    } catch (error) {
        console.error("Error al enviar correo de verificación:", error);
        res.status(500).json({ error: "Error al enviar correo de verificación" });
    }
});

//Validar token  de registro 

app.get("/verificar-email", async (req, res) => {
    const { id_token } = req.query;

    if (!id_token) {
        return res.status(400).json({ success: false, message: "Token no proporcionado" });
    }

    try {
        const [rows] = await bd.execute(
            "SELECT id, expiracion, id_usuario FROM token WHERE id = ? AND usado = 0 AND expiracion > NOW();",
            [id_token]
        );

        if (rows.length === 0) {
            return res.status(400).json({ success: false, message: "Token inválido o expirado" });
        }

        const verificadoUsuario = 1;

        // Marcar como usado
        await bd.execute("UPDATE token SET usado = 1 WHERE id = ?", [id_token]);
        await bd.execute("UPDATE `usuario` SET `email_verificado` = ? WHERE `usuario`.`id` = ?", [verificadoUsuario, rows[0].id_usuario]);

        return res.json({ success: true, message: "Correo verificado correctamente" });
    } catch (err) {
        console.error(err);

        return res.status(500).json({ success: false, message: "Error interno" });
    }
});



//validar token de restablecimiento 
app.post("/cambiar-password", async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
        return res.status(400).json({ success: false, message: "Datos incompletos" });
    }

    try {
        // Validar token
        const [rows] = await bd.execute(
            "SELECT  id, expiracion, id_usuario FROM token WHERE id = ? AND usado = 0 AND expiracion > NOW()",
            [token]
        );

        if (rows.length === 0) {
            return res.status(400).json({ success: false, message: "Token inválido o expirado" });
        }

        const userId = rows[0].id_usuario;

        // Hashear nueva contraseña
        const hashedPw = await bcrypt.hash(password, 10);

        // Actualizar contraseña
        await bd.execute("UPDATE usuario SET password = ? WHERE id = ?", [hashedPw, userId]);

        // Marcar token como usado
        await bd.execute("UPDATE token SET usado = 1 WHERE id = ?", [token]);

        return res.json({ success: true, message: "Contraseña actualizada correctamente" });
    } catch (error) {
        console.error("Error al cambiar contraseña:", error);
        return res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
});

