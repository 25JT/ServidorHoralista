import bd from "../config/Bd.js";

// Este sistema automatizado maneja los cambios de estado de las citas sin intervención manual.
// Se ejecuta cada minuto para asegurar que las citas pasen a 'en curso' y 'completada' a tiempo.

const ACTUALIZAR_INTERVALO = 60000; // 1 minuto

setInterval(async () => {
  try {
    // console.log("[Cron] Iniciando actualización de estados de citas...");

    // 1. Transición a 'en curso':
    // Citas que están en 'pendiente' o 'confirmada' y cuya hora ya llegó (o pasó).
    const [resEnCurso] = await bd.query(`
            UPDATE agenda 
            SET estado = 'en curso', updated_at = CURRENT_TIMESTAMP
            WHERE estado IN ('pendiente', 'confirmada') 
              AND fecha = CURDATE() 
              AND hora <= CURTIME();
        `);
    //   console.log(resEnCurso);


    if (resEnCurso.affectedRows > 0) {
      // console.log(`[Auto-Status] ${resEnCurso.affectedRows} citas cambiadas a 'en curso'.`);
    }

    // 2. Transición a 'completada':
    // Citas en 'en curso' que ya superaron su duración.
    // La duración se toma de catalogos.duracion o pservicio.intervaloCitas (default 30 min).
    const [resCompletada] = await bd.query(`
            UPDATE agenda a
            JOIN pservicio p ON a.id_pservicio = p.id
            LEFT JOIN catalogos c ON a.id_catalogo = c.id
            SET a.estado = 'completada', a.updated_at = CURRENT_TIMESTAMP
            WHERE a.estado = 'en curso'
              AND (
                (a.fecha < CURDATE()) 
                OR 
                (a.fecha = CURDATE() AND ADDTIME(a.hora, SEC_TO_TIME(COALESCE(c.duracion, p.intervaloCitas, 30) * 60)) <= CURTIME())
              );
        `);

    if (resCompletada.affectedRows > 0) {
      // console.log(`[Auto-Status] ${resCompletada.affectedRows} citas marcadas como 'completada'.`);

      // 3. Crear entradas en 'calificacion' para las citas recién completadas
      // Se verifica que el usuario NO haya calificado ya este servicio/local (id_pservicio + id_usuario)
      await bd.query(`
                INSERT INTO calificacion (id, id_pservicio, id_usuario, calificacion_mostrada, calificacion)
                SELECT UUID(), a.id_pservicio, a.id_usuario_cliente, 0, 0
                FROM agenda a
                WHERE a.estado = 'completada'
                  AND NOT EXISTS (
                    SELECT 1 FROM calificacion c 
                    WHERE c.id_usuario = a.id_usuario_cliente 
                      AND c.id_pservicio = a.id_pservicio
                  )
                GROUP BY a.id_pservicio, a.id_usuario_cliente;
            `);
    }

  } catch (error) {
    console.error("Error crítico en el cron de ControlEstados:", error);
  }
}, ACTUALIZAR_INTERVALO);
