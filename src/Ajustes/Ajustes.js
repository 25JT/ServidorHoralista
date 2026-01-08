import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";

import { verificarSesion } from "../middleware/autenticacion.js";

export function diasTrabajo() {
    //  Middleware de autenticación aplicado
    app.post("/api/diasTrabajo", verificarSesion, async (req, res) => {
        try {
            //  Usar el userId de la sesión (fuente de verdad)

            const [rows] = await bd.query(`SELECT 
            p.dias_trabajo,
            e.fecha,
            e.es_laborable
            FROM pservicio AS p
            INNER JOIN pservicio_excepcion AS e
            ON e.id_usuario = p.id_usuario
            WHERE p.id_usuario = ?`, [req.session.userId]);

            console.log(rows.length, "linea 20");
            if (rows.length === 0 || rows === null) {
                const [rows] = await bd.query(`select dias_trabajo from  pservicio where id_usuario = ?`, [req.session.userId]);
                res.json({ status: 200, success: true, data: rows });
                return

            }

            res.json({ status: 200, success: true, data: rows });
        } catch (error) {
            console.error("Error al obtener ajustes:", error);
            res.status(500).json({ status: 500, success: false, message: "Error al obtener ajustes", error: error.message });
        }
    })
}

export function intervaloCitas() {
    //  Middleware de autenticación aplicado
    app.post("/api/duracionCita", verificarSesion, async (req, res) => {
        try {
            //  Usar el userId de la sesión (fuente de verdad)           
            const { intervaloCita } = req.body;

            //  console.log("intervaloCita:", intervaloCita);


            //  Actualizar solo si el usuario es el propietario (garantizado por la sesión)
            await bd.query("UPDATE pservicio SET intervaloCitas = ? WHERE id_usuario = ?", [intervaloCita, req.session.userId]);

            res.json({ success: true, message: "Configuración actualizada correctamente" });

        } catch (error) {
            console.error("Error al actualizar ajustes:", error);
            res.status(500).json({ success: false, message: "Error al actualizar ajustes", error: error.message });
        }
    })

}

export function horasDisponibles() {
    app.post("/api/horasLaborales", verificarSesion, async (req, res) => {
        try {
            const horaInicio = req.body.horaInicio;
            const horaFin = req.body.horaFin;

            // console.log("horaInicio (desde body):", horaInicio);
            // console.log("horaFin (desde body):", horaFin);

            if (!horaInicio || !horaFin) {
                return res.status(400).json({ success: false, message: "Faltan las horas de inicio y fin" });
            }

            //  Actualizar solo si el usuario es el propietario (garantizado por la sesión)
            await bd.query("UPDATE pservicio SET hora_inicio = ?, hora_fin = ? WHERE id_usuario = ?", [horaInicio, horaFin, req.session.userId]);

            res.json({ success: true, message: "Configuración actualizada correctamente" });

        } catch (error) {
            console.error("Error al obtener ajustes:", error);
            res.status(500).json({ success: false, message: "Error al obtener ajustes", error: error.message });
        }
    })
}

export function diasExcepcionales() {
    app.post("/api/fechasExcep", verificarSesion, async (req, res) => {
        try {
            const diasExcepciones = req.body.diasExcepciones;

            // console.log("diasExcepciones recibidos:", diasExcepciones);

            if (!diasExcepciones || typeof diasExcepciones !== 'object') {
                return res.status(400).json({ success: false, message: "Faltan los dias excepcionales o el formato es incorrecto" });
            }

            // 1. Obtener el id_pservicio relacionado con el usuario
            const [pservicioRows] = await bd.query("SELECT id FROM pservicio WHERE id_usuario = ?", [req.session.userId]);

            if (pservicioRows.length === 0) {
                return res.status(404).json({ success: false, message: "No se encontró un servicio asociado a este usuario profesional." });
            }

            const id_pservicio = pservicioRows[0].id;

            // 2. Procesar cada fecha
            for (const [fechaOriginal, esLaborable] of Object.entries(diasExcepciones)) {
                const es_laborable = esLaborable ? 1 : 0;

                // Formatear la fecha si viene en formato YYYY-M-D (ej: 2026-0-14 -> 2026-01-14)
                // Nota: Si el front envía el mes 0-indexado, sumamos 1.
                const partes = fechaOriginal.split('-');
                if (partes.length === 3) {
                    const year = partes[0];
                    const month = (parseInt(partes[1]) + 1).toString().padStart(2, '0');
                    const day = partes[2].padStart(2, '0');
                    const fechaFormateada = `${year}-${month}-${day}`;

                    // ✅ VALIDACIÓN: Solo permitir fechas futuras (no hoy, no pasado)
                    const ahora = new Date();
                    // Obtener fecha actual en Bogotá (UTC-5)
                    const offset = -5;
                    const hoyBogota = new Date(ahora.getTime() + (offset * 3600000) + (ahora.getTimezoneOffset() * 60000));
                    const hoyStr = hoyBogota.toISOString().split('T')[0];

                    if (fechaFormateada <= hoyStr) {
                        //   console.log(`⚠️ Saltando fecha ${fechaFormateada} por ser hoy o pasada.`);
                        continue;
                    }


                    // ✅ VALIDACIÓN EXISTENCIA: Verificar si ya existe una excepción para esta fecha y servicio
                    const [exists] = await bd.query("SELECT id FROM pservicio_excepcion WHERE id_pservicio = ? AND fecha = ?", [id_pservicio, fechaFormateada]);

                    if (exists.length > 0) {
                        // Actualizar la excepción existente
                        await bd.query("UPDATE pservicio_excepcion SET es_laborable = ? WHERE id_pservicio = ? AND fecha = ?", [es_laborable, id_pservicio, fechaFormateada]);
                        //     console.log(`✅ Actualizada excepción para ${fechaFormateada}`);
                    } else {
                        // Insertar la nueva excepción
                        await bd.query(`
                            INSERT INTO pservicio_excepcion (id, id_pservicio, id_usuario, fecha, es_laborable, created_at)
                            VALUES (UUID(), ?, ?, ?, ?, NOW())
                        `, [id_pservicio, req.session.userId, fechaFormateada, es_laborable]);
                        //     console.log(`✅ Insertada nueva excepción para ${fechaFormateada}`);
                    }
                }
            }

            res.json({ success: true, message: "Excepciones de calendario actualizadas correctamente" });

        } catch (error) {
            console.error("Error al actualizar excepciones de calendario:", error);
            res.status(500).json({ success: false, message: "Error al actualizar excepciones", error: error.message });
        }
    })
}

horasDisponibles();
diasExcepcionales();
intervaloCitas();
diasTrabajo();
