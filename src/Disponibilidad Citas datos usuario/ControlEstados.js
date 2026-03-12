import bd from "../config/Bd.js";

// Este sistema automatizado maneja los cambios de estado de las citas sin intervención manual.
// Se ejecuta cada minuto para asegurar que las citas pasen a 'en curso' y 'completada' a tiempo.

const ACTUALIZAR_INTERVALO = 30000; // 30 segundos

export function startControlEstados(io) {
  //console.log("🚀 [ControlEstados] Sistema de automatización de estados iniciado.");

  setInterval(async () => {
    try {
      //console.log("⏱️ [Cron] Ejecutando revisión de estados (Cada 30 seg)...");
      // 1. Transición a 'en curso':
      const [resEnCurso] = await bd.query(`
      UPDATE agenda 
      SET estado = 'en curso', updated_at = CURRENT_TIMESTAMP
      WHERE estado IN ('pendiente','confirmada','0','1')
      AND TIMESTAMP(fecha, hora) <= NOW();

        
`);

      console.log(resEnCurso);

      if (resEnCurso.affectedRows > 0) {
        //    const numClientes = io.sockets.sockets.size;
        //  console.log(`✅ [Cron] ${resEnCurso.affectedRows} citas -> 'en curso'. Emitiendo a ${numClientes} clientes...`);
        io.emit("actualizar_estado_citas", { estado: "en curso", affectedRows: resEnCurso.affectedRows });
      }

      // 2. Transición a 'completada':
      const [resCompletada] = await bd.query(`
    UPDATE agenda a
    JOIN pservicio p ON a.id_pservicio = p.id
    LEFT JOIN catalogos c ON a.id_catalogo = c.id
    SET a.estado = 'completada', a.updated_at = CURRENT_TIMESTAMP
    WHERE a.estado = 'en curso'
    AND (
      TIMESTAMP(a.fecha, a.hora) +
      INTERVAL COALESCE(c.duracion, p.intervaloCitas, 30) MINUTE
    ) <= NOW();
          `);

      if (resCompletada.affectedRows > 0) {
        // const numClientes = io.sockets.sockets.size;
        //     console.log(`✅ [Cron] ${resCompletada.affectedRows} citas -> 'completada'. Emitiendo a ${numClientes} clientes...`);
        io.emit("actualizar_estado_citas", { estado: "completada", affectedRows: resCompletada.affectedRows });

        // 3. Crear entradas en 'calificacion'
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
}
