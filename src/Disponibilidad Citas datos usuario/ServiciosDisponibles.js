import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";
//Mostrar citas o Servicios disponibles

app.get("/serviciosDisponibles", async (req, res) => {
    try {
        const [rows] = await bd.query("SELECT nombre_establecimiento, telefono_establecimiento, direccion, hora_inicio, hora_fin, dias_trabajo, Servicio, precio, id FROM pservicio");
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