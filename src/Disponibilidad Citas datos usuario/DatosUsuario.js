import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";

app.post("/datosUsuario", async (req, res) => {

    try {
        const { userid, id } = req.body;
        const [rows] = await bd.query("SELECT nombre, apellidos, telefono, correo FROM `usuario` WHERE id =?", [userid]);
        const [rows2] = await bd.query("SELECT nombre_establecimiento, dias_trabajo, telefono_establecimiento, direccion, intervaloCitas FROM `pservicio` WHERE id =?", [id]);
        res.json({
            rows,
            rows2,
            success: true,
            data: rows || rows2,
        });

    } catch (error) {
        console.error("Error al mostrar los datos del usuario:", error);
        res.status(500).json({
            success: false,
            message: "Error al mostrar los datos del usuario",
            error: error.message,
        });
    }
});

//Datos del usuario para enviar a confirmacion de citas

app.post("/datos-usuario", async (req, res) => {
    const { id } = req.body;
    const [rows] = await bd.query(`
SELECT 
    DATE_FORMAT(a.fecha, '%d-%m-%Y') AS fecha,
    DATE_FORMAT(a.hora, '%r') AS hora,
    
  u.nombre AS nombre_usuario,
    s.Servicio AS nombre_servicio,
    s.Precio AS precio_servicio
FROM    agenda a
INNER JOIN usuario u 
    ON a.id_usuario_cliente = u.id
INNER JOIN pservicio s 
    ON a.id_pservicio = s.id
    WHERE a.id = ? `, [id]);
    res.json(rows);
})

