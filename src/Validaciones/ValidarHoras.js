

import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";
//validar horas de citas

app.post("/validarHoras", async (req, res) => {
    try {
        const { id, fecha, id_catalogo } = req.body;

        // 1. Validar entrada
        if (!id || !fecha) {
            return res.status(400).json({
                success: false,
                message: "ID de servicio y fecha son requeridos"
            });
        }

        // 2. Obtener rango de horas del servicio y el intervalo por defecto
        const [servicio] = await bd.query(
            "SELECT hora_inicio, hora_fin, intervaloCitas FROM pservicio WHERE id = ?",
            [id]
        );

        if (servicio.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Establecimiento no encontrado"
            });
        }

        let intervaloFinal = servicio[0].intervaloCitas || 60;

        let nombreServicioFinal = null;

        // 3. Si viene un id_catalogo válido, buscar su duración y nombre específico para este establecimiento
        if (id_catalogo && id_catalogo !== "null") {
            const [catalogo] = await bd.query(
                "SELECT duracion, nombre_servicio FROM catalogos WHERE id = ? AND id_pservicio = ?",
                [id_catalogo, id]
            );
            if (catalogo.length > 0) {
                if (catalogo[0].duracion) {
                    intervaloFinal = parseInt(catalogo[0].duracion);
                }
                nombreServicioFinal = catalogo[0].nombre_servicio;
            }
        }

        // 4. Obtener horas ocupadas con sus duraciones
        const [ocupadas] = await bd.query(
            `SELECT a.hora, c.duracion 
             FROM agenda a
             LEFT JOIN catalogos c ON a.id_catalogo = c.id
             WHERE a.id_pservicio = ? AND a.fecha = ? 
             AND a.estado IN ('confirmada', 'pendiente', 'reservada')`,
            [id, fecha]
        );

        // 5. Obtener fechas especiales y capacidad especial
        const [fechasEspeciales] = await bd.query(
            "SELECT fecha, es_laborable FROM pservicio_excepcion WHERE id_pservicio = ?",
            [id]
        );

        const [capacidadEspecial] = await bd.query(
            `SELECT hora_inicio, hora_fin, fecha, total_citas FROM pservicio_capacidad_dia 
             WHERE id_pservicio = ? AND fecha = ? AND activo = 1`,
            [id, fecha]
        );

        const parseToMinutes = (timeStr) => {
            if (!timeStr) return 0;
            const [h, m] = timeStr.split(':').map(Number);
            return h * 60 + (m || 0);
        };

        // 6. Generar todas las horas posibles
        let todasHoras = [];
        const esp = capacidadEspecial[0];

        if (esp && esp.total_citas > 0) {
            // Lógica de capacidad especial (distribuye citas en un rango)
            const espInicioMin = parseToMinutes(esp.hora_inicio);
            const espFinMin = parseToMinutes(esp.hora_fin);
            const tiempoTotal = espFinMin - espInicioMin;

            let calculado = esp.total_citas > 1
                ? Math.floor(tiempoTotal / (esp.total_citas - 1))
                : tiempoTotal;

            // Usamos el mayor entre el calculado y el intervalo base del establecimiento
            let intervaloEsp = Math.max(calculado, servicio[0].intervaloCitas || 60);

            let curMin = espInicioMin;
            let count = 0;
            while (curMin <= espFinMin && count < esp.total_citas) {
                const h = Math.floor(curMin / 60);
                const m = curMin % 60;
                todasHoras.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`);
                curMin += intervaloEsp;
                count++;
            }
        } else {
            // Comportamiento normal: intervalo fijo (del catálogo o base)
            const inicioMinutos = parseToMinutes(servicio[0].hora_inicio);
            const finMinutos = parseToMinutes(servicio[0].hora_fin);

            for (let min = inicioMinutos; min < finMinutos; min += intervaloFinal) { // min < finMinutos porque debe poder durar al menos algo
                const h = Math.floor(min / 60);
                const m = min % 60;
                todasHoras.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`);
            }
        }

        // 7. Filtrar horas disponibles considerando duración de citas existentes y límites de capacidad
        const defaultInterval = servicio[0].intervaloCitas || 60;
        const limiteTotal = (esp && esp.total_citas > 0) ? esp.total_citas : 999;

        // Si ya llegamos al limite de citas para este dia especial
        if (ocupadas.length >= limiteTotal) {
            return res.json({
                success: true,
                disponibles: [],
                message: "Capacidad máxima alcanzada para este día."
            });
        }

        const horasDisponibles = todasHoras.filter(horaCandidata => {
            const inicioCandidato = parseToMinutes(horaCandidata);
            const finCandidato = inicioCandidato + intervaloFinal;

            // A. Validar que no pase de la hora de cierre
            const horaCierreMin = esp ? parseToMinutes(esp.hora_fin) : parseToMinutes(servicio[0].hora_fin);
            if (finCandidato > horaCierreMin) return false;

            // B. Validar solapamientos con citas existentes
            for (const cita of ocupadas) {
                const inicioExistente = parseToMinutes(cita.hora);
                const duracionExistente = cita.duracion ? parseInt(cita.duracion) : defaultInterval;
                const finExistente = inicioExistente + duracionExistente;

                if (inicioCandidato < finExistente && finCandidato > inicioExistente) {
                    return false;
                }
            }
            return true;
        });

        res.json({
            success: true,
            rango: {
                ...servicio[0],
                intervaloCitas: intervaloFinal
            },
            ocupadas: ocupadas, // Enviamos el objeto completo (hora y duración)
            disponibles: horasDisponibles,
            nombreServicio: nombreServicioFinal,
            fechasEspeciales: fechasEspeciales,
            capacidadEspecial: esp || null
        });

    } catch (error) {
        console.error("Error al validar las horas:", error);
        res.status(500).json({
            success: false,
            message: "Error interno al validar las horas",
            error: error.message,
        });
    }
});