import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";
//Mostrar citas o Servicios disponibles

app.get("/serviciosDisponibles", async (req, res) => {
    try {
        const [rows] = await bd.query("SELECT nombre_establecimiento, telefono_establecimiento, direccion, hora_inicio, hora_fin, dias_trabajo, Servicio, precio, id, descripcion, logo, banner FROM pservicio");
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