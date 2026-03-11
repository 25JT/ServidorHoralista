import { app } from "../config/Seccion.js";
import bcrypt from 'bcrypt';
import bd from "../config/Bd.js";
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// Cerrar sesión
app.post("/logout", async (req, res) => {
    try {
        const token = req.cookies.remember_token;
        if (token) {
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
            await bd.query("DELETE FROM remember_token_seccion WHERE token_hash = ?", [tokenHash]);
        }
    } catch (error) {
        console.error("Error al eliminar remember_token de la DB:", error);
    }

    req.session.destroy(err => {
        if (err) {
            console.error("Error al cerrar sesión:", err);
            return res.status(500).json({
                success: false,
                message: "Error al cerrar sesión",
                error: err.message
            });
        }

        res.clearCookie('session_horalista', { path: '/' }); // borra la cookie de sesión
        res.clearCookie('remember_token', { path: '/' }); // borra la cookie de persistencia
        res.json({
            success: true,
            message: "Sesión cerrada correctamente"
        });
    });
});