import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";
import { verificarSesion } from "../middleware/autenticacion.js";

//citas en su agenda
// ✅ Protegido con verificarSesion
app.post("/mostrarCitas", verificarSesion, async (req, res) => {

    // ✅ Usar el userId de la sesión (fuente de verdad)
    const userid = req.session.userId;

    try {
        const [rows] = await bd.query(`SELECT 
        a.id,
        a.fecha,
        a.hora,
        a.estado,
        p.nombre_establecimiento AS nombre_servicio,
        p.id AS id_pservicio
    FROM agenda AS a
    JOIN pservicio AS p 
        ON a.id_pservicio = p.id
    WHERE a.id_usuario_cliente = ?
      AND a.fecha >= CURDATE()
    ORDER BY a.fecha, a.hora;
            `, [userid]);

        res.json({
            success: true,
            data: rows,
        });
    } catch (error) {
        console.error("Error al mostrar las citas:", error);
        res.status(500).json({
            success: false,
            message: "Error al mostrar las citas",
            error: error.message,
        });
    }
});