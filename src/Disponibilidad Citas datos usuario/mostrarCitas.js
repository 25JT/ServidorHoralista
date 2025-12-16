
import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";

//citas en su agenda
app.post("/mostrarCitas", async (req, res) => {

    const userid = req.body.userid;

    try {
        const [rows] = await bd.query(`SELECT 
        a.id,
        a.fecha,
        a.hora,
        a.estado,
        p.nombre_establecimiento AS nombre_servicio
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