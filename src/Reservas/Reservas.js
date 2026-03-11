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
    const [rows] = await bd.query(`SELECT
    a.hora,
    a.fecha,
    GROUP_CONCAT(a.notas) AS notas,
    a.estado,
    u.nombre,
    COALESCE(c.nombre_servicio, 'Servicio General') AS servicio,
    ANY_VALUE(u.id) AS usuario_id,
    ANY_VALUE(a.id) AS agenda_id
FROM agenda AS a
JOIN usuario AS u
    ON a.id_usuario_cliente = u.id
LEFT JOIN catalogos AS c
    ON a.id_catalogo = c.id
WHERE a.id_pservicio = ?
  AND a.fecha >= CURDATE()
GROUP BY a.fecha, a.hora, a.estado, u.nombre, c.nombre_servicio
ORDER BY a.fecha ASC, a.hora ASC;


`, [idPservicio]);
    const [updates] = await bd.query("SELECT MAX(updated_at) AS lastUpdate FROM agenda WHERE id_pservicio = ?", [idPservicio]);
    const ultimaActualizacion = updates[0].lastUpdate;

    res.json({
      success: true,
      data: rows,
      idPservicio,
      NombreEstablecimiento,
      ultimaActualizacion
    });
  } catch (error) {
    console.error("Error al mostrar las citas:", error);
    res.status(500).json({ success: false, message: "Error al mostrar las citas", error: error.message });
  }
})

// verificar si hay una actualización en el estado o datos de las citas
app.post("/api/Reservas/verificar", verificarSesion, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { ultimaActualizacion } = req.body;

    // 1. Obtener el ID del establecimiento
    const [negocio] = await bd.query("SELECT id FROM pservicio WHERE id_usuario = ?", [userId]);
    if (negocio.length === 0) {
      return res.json({ success: false, message: "No se encontró el establecimiento" });
    }
    const idPservicio = negocio[0].id;

    // 2. Verificar si hay cambios desde la última actualización
    const [updateCheck] = await bd.query(`
      SELECT COUNT(*) as nuevosCambios, MAX(updated_at) as nuevoTimestamp 
      FROM agenda 
      WHERE id_pservicio = ? AND updated_at > ?
    `, [idPservicio, ultimaActualizacion]);

    if (updateCheck[0].nuevosCambios === 0) {
      return res.status(204).end(); // No hay cambios
    }

    // 3. Si hay cambios, devolver los datos actualizados (misma estructura que /api/Reservas)
    const [rows] = await bd.query(`SELECT
        a.hora,
        a.fecha,
        GROUP_CONCAT(a.notas) AS notas,
        a.estado,
        u.nombre,
        COALESCE(c.nombre_servicio, 'Servicio General') AS servicio,
        ANY_VALUE(u.id) AS usuario_id,
        ANY_VALUE(a.id) AS agenda_id
    FROM agenda AS a
    JOIN usuario AS u ON a.id_usuario_cliente = u.id
    LEFT JOIN catalogos AS c ON a.id_catalogo = c.id
    WHERE a.id_pservicio = ? AND a.fecha >= CURDATE()
    GROUP BY a.fecha, a.hora, a.estado, u.nombre, c.nombre_servicio
    ORDER BY a.fecha ASC, a.hora ASC;
    `, [idPservicio]);

    res.json({
      success: true,
      data: rows,
      ultimaActualizacion: updateCheck[0].nuevoTimestamp
    });

  } catch (error) {
    console.error("Error en /api/Reservas/verificar:", error);
    res.status(500).json({ success: false, message: "Error al verificar actualizaciones" });
  }
});
