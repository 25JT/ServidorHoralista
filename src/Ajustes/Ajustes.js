import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";
import validacionUserid from "../Validaciones/validacionUserid.js";
import validacionRol from "../Validaciones/validacionRol.js"

export function diasTrabajo() {
    app.post("/api/diasTrabajo", async (req, res) => {
        try {
            const { userid } = req.body;
            const [rows] = await bd.query("SELECT dias_trabajo FROM pservicio WHERE id_usuario = ?", [userid]);
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error("Error al obtener ajustes:", error);
            res.status(500).json({ success: false, message: "Error al obtener ajustes", error: error.message });
        }
    })
}

export function intervaloCitas() {
    app.post("/api/duracionCita", async (req, res) => {
        try {
            const { userid } = req.body;
            const { rol } = req.body;
            const { intervaloCita } = req.body;

            if (userid === null || rol === null || intervaloCita === null) {
                return res.status(400).json({ success: false, message: "Faltan datos requeridos" });
            }

            const validacionid = await validacionUserid(userid);
            if (validacionid.length === 0) {
                return res.status(400).json({ success: false, message: "Usuario no encontrado" });
            }

            const validacionrol = await validacionRol(userid);

            if (validacionrol.length === 0) {
                return res.status(400).json({ success: false, message: "Rol no encontrado" });
            }

            try {
                await bd.query("UPDATE pservicio SET intervaloCitas = ? WHERE id_usuario = ?", [intervaloCita, userid]);

                res.json({ success: true });
            } catch (error) {
                console.error("Error al actualizar ajustes:", error);
                res.status(500).json({ success: false, message: "Error al actualizar ajustes", error: error.message });
            }

        } catch (error) {
            console.error("Error al obtener ajustes:", error);
            res.status(500).json({ success: false, message: "Error al obtener ajustes", error: error.message });
        }
    })

}


intervaloCitas();
diasTrabajo();
