import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";
import { verificarSesion } from "../middleware/autenticacion.js";



//Mostrar citas al prestador de servicio

// ✅ Protegido con middleware de autenticación
app.post("/api/Reservas", verificarSesion, async (req, res) => {
  try {
    // ✅ Usar el userId de la sesión (fuente de verdad)
    const userid = req.session.userId;

    const [id] = await bd.query("SELECT id, nombre_establecimiento FROM `pservicio` WHERE id_usuario = ?", [userid]);
    if (id == null) {
      return res.json({ success: false, message: "No se encontro ningun servicio" });
    }
    const idPservicio = id[0].id;
    const NombreEstablecimiento = id[0].nombre_establecimiento;
    const [rows] = await bd.query(`   SELECT
    a.hora,
    a.fecha,
    GROUP_CONCAT(a.notas) AS notas,
    a.estado,
    u.nombre,
    ANY_VALUE(u.id) AS usuario_id,
    ANY_VALUE(a.id) AS agenda_id
FROM agenda AS a
JOIN usuario AS u
    ON a.id_usuario_cliente = u.id
WHERE a.id_pservicio = ?
  AND a.fecha >= CURDATE()
GROUP BY a.fecha, a.hora, a.estado, u.nombre
ORDER BY a.fecha ASC, a.hora ASC;


`, [idPservicio]);
    res.json({
      success: true,
      data: rows,
      idPservicio,
      NombreEstablecimiento
    });
  } catch (error) {
    console.error("Error al mostrar las citas:", error);
    res.status(500).json({ success: false, message: "Error al mostrar las citas", error: error.message });
  }
})