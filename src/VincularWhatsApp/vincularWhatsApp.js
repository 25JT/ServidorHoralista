import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";
import { RutaFront } from "../RutaFront/Ruta.js";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { verificarSesion } from "../middleware/autenticacion.js";

export function VincularWhatsApp() {
    app.post("/vincularWhatsApp", verificarSesion, async (req, res) => {

        try {
            // const tokenId = crypto.randomUUID();
            // const expiracion = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
            const userid = req.session.userId;
            const [rows] = await bd.execute("SELECT id,id_usuario FROM pservicio WHERE id_usuario = ?", [userid]);
            console.log(rows);

            if (rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: "Usuario no encontrado"
                });
            }

            const negocio_id = rows[0].id;




            res.status(200).json({ message: "Envio exitoso", success: true });
        } catch (error) {
            console.error("Error al enviar correo de verificación:", error);
            res.status(500).json({ error: "Error al enviar correo de verificación", success: false });
        }
    });
}

VincularWhatsApp();
