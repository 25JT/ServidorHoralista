import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";
import validacionRol from "../Validaciones/validacionRol.js";
import { verificarSesion } from "../middleware/autenticacion.js";

export function diasTrabajo() {
    //  Middleware de autenticación aplicado
    app.post("/api/diasTrabajo", verificarSesion, async (req, res) => {
        try {
            //  Usar el userId de la sesión (fuente de verdad)
            const userid = req.session.userId;

            const [rows] = await bd.query("SELECT dias_trabajo FROM pservicio WHERE id_usuario = ?", [userid]);
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error("Error al obtener ajustes:", error);
            res.status(500).json({ success: false, message: "Error al obtener ajustes", error: error.message });
        }
    })
}

export function intervaloCitas() {
    //  Middleware de autenticación aplicado
    app.post("/api/duracionCita", verificarSesion, async (req, res) => {
        try {
            //  Usar el userId de la sesión (fuente de verdad)
            const userid = req.session.userId;
            const userRole = req.session.role;
            const { intervaloCita } = req.body;

            console.log("intervaloCita:", intervaloCita);
            console.log("userid (desde sesión):", userid);
            console.log("userRole (desde sesión):", userRole);

            if (!intervaloCita) {
                return res.status(400).json({ success: false, message: "Falta el intervalo de cita" });
            }

            //  Validar que el usuario tenga rol de profesional
            const validacionrol = await validacionRol(userid);
            console.log("Validación de rol:", validacionrol);

            if (validacionrol.length === 0 || validacionrol[0].rol !== "profesional") {
                return res.status(403).json({
                    success: false,
                    message: "No tienes permisos para realizar esta acción. Solo usuarios profesionales pueden modificar esta configuración."
                });
            }

            //  Actualizar solo si el usuario es el propietario (garantizado por la sesión)
            await bd.query("UPDATE pservicio SET intervaloCitas = ? WHERE id_usuario = ?", [intervaloCita, userid]);

            res.json({ success: true, message: "Configuración actualizada correctamente" });

        } catch (error) {
            console.error("Error al actualizar ajustes:", error);
            res.status(500).json({ success: false, message: "Error al actualizar ajustes", error: error.message });
        }
    })

}


intervaloCitas();
diasTrabajo();
