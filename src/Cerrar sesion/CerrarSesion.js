import { app } from "../config/Seccion.js";

// Cerrar sesión
app.post("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Error al cerrar sesión:", err);
            return res.status(500).json({
                success: false,
                message: "Error al cerrar sesión",
                error: err.message
            });
        }

        res.clearCookie('connect.sid'); // borra la cookie de sesión
        res.json({
            success: true,
            message: "Sesión cerrada correctamente"
        });
    });
});