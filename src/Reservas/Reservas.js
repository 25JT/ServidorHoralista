import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";



//Mostrar citas al prestador de servicio

app.post("/api/Reservas", async (req, res) => {
    try {
        const { userid } = req.body;
        const [id] = await bd.query("SELECT id, nombre_establecimiento FROM `pservicio` WHERE id_usuario = ?", [userid]);
        if (id == null) {
            return res.json({ success: false, message: "No se encontro ningun servicio" });
        }
        const idPservicio = id[0].id;
        const NombreEstablecimiento = id[0].nombre_establecimiento;
        const [rows] = await bd.query(`   SELECT
  a.id AS agenda_id,
  a.hora,
  a.fecha,
  a.notas,
  a.estado,
  u.id AS usuario_id,
  u.nombre
FROM agenda a
JOIN usuario u
  ON a.id_usuario_cliente = u.id
WHERE a.id_pservicio = ?
  AND a.fecha >= CURDATE()
  AND a.archived = false
ORDER BY a.fecha ASC, a.hora ASC;



`, [idPservicio]);
        res.json({
            success: true,
            data: rows,
            NombreEstablecimiento
        });
    } catch (error) {
        console.error("Error al mostrar las citas:", error);
        res.status(500).json({ success: false, message: "Error al mostrar las citas", error: error.message });
    }
})