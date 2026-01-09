import { verificarSesion } from "../middleware/autenticacion.js";
import bd from "../config/Bd.js";
import { app } from "../config/Seccion.js";

app.post("/fechas-especiales", verificarSesion, async (req, res) => {

    try {
        //  console.log("fechas-especiales", req.body);

        const { id } = req.body;
        const [rows] = await bd.query(`SELECT fecha, es_laborable 
                                        FROM pservicio_excepcion 
                                        WHERE id_pservicio = ?
                                        AND fecha >= CURDATE() 
                                        ORDER BY fecha ASC 
                                        LIMIT 20;`, [id]);

        if (rows.length === 0) {
            return res.status(200).json({ success: false, message: "No se encontraron fechas especiales para este servicio", data: rows });
        }

        //  const rowsFiltradas = rows.filter((row) => row.es_laborable !== 0);
        return res.status(200).json({ success: true, message: "Fechas especiales obtenidas exitosamente", data: rows });

    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Error al obtener fechas especiales", error: error.message });
    }
})