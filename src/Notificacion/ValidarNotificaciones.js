import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";
import { verificarAutenticacionYPropietario } from "../middleware/autenticacion.js";

app.get("/api/notificaciones/:userid", async (req, res) => {
    try {
        const useridFront = req.params.userid;
        const userId = req.session.userId;

        return res.status(200).json(true);
        //     const [notificaciones] = await bd.query("select * from notificaciones where id_usuario = ?", [userId]);

        //     if (notificaciones.length > 0) {
        //         return res.status(200).json(1);
        //     } else {
        //         return res.status(200).json(0);
        //     }
    } catch (error) {
        console.error("Error en /api/notificaciones/validar: ", error);
        return res.status(500).json({ message: "Error al validar notificaciones" });
    }
});

