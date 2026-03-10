import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";
//Mostrar citas o Servicios disponibles

app.get("/serviciosDisponibles", async (req, res) => {
    try {
        const [rows] = await bd.query(`
  
SELECT 
    p.nombre_establecimiento, 
    p.telefono_establecimiento, 
    p.direccion, 
    p.hora_inicio, 
    p.hora_fin, 
    p.dias_trabajo, 
    p.Servicio, 
    p.precio, 
    p.id, 
    p.descripcion, 
    p.logo, 
    p.banner,
    ROUND(IFNULL(AVG(c.calificacion), 0), 1) AS media_calificacion,
    COUNT(c.calificacion) AS total_calificaciones
FROM pservicio p
LEFT JOIN calificacion c ON p.id = c.id_pservicio
GROUP BY p.id;
        `);
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

app.get("/catalogo/vista/usuario/:id", async (req, res) => {
    try {

        const id = req.params.id;
        const existeId = await bd.query("SELECT id_pservicio FROM catalogos WHERE id_pservicio= ?", [id]);
        if (existeId.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No existe el id",
            });
        }

        const [rows] = await bd.query("SELECT nombre_servicio, precio, duracion,descripcion, foto1, foto2,foto3, id_pservicio , id FROM catalogos WHERE id_pservicio= ?", [id]);


        res.status(200).json({
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