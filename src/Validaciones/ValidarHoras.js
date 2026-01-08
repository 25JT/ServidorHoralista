

import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";
//validar horas de citas

app.post("/validarHoras", async (req, res) => {
    try {
        const { id, fecha } = req.body;

        // 1. Validar entrada
        if (!id || !fecha) {
            return res.status(400).json({
                success: false,
                message: "ID de servicio y fecha son requeridos"
            });
        }

        // 2. Obtener rango de horas del servicio
        const [servicio] = await bd.query(
            "SELECT hora_inicio, hora_fin, intervaloCitas FROM pservicio WHERE id = ?",
            [id]
        );

        if (servicio.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Servicio no encontrado"
            });
        }

        // 3. Obtener horas ocupadas (incluyendo estados relevantes)
        const [ocupadas] = await bd.query(
            `SELECT hora FROM agenda 
             WHERE id_pservicio = ? AND fecha = ? 
             AND estado IN ('confirmada', 'pendiente', 'reservada')`,
            [id, fecha]
        );

        //4. obtener fechas especiales
        const [fechasEspeciales] = await bd.query(
            `SELECT fecha, es_laborable FROM pservicio_excepcion WHERE id_pservicio = ?`,
            [id]
        );



        // 5. Generar todas las horas posibles en el rango
        const horaInicio = parseInt(servicio[0].hora_inicio.split(':')[0]);
        const horaFin = parseInt(servicio[0].hora_fin.split(':')[0]);

        const todasHoras = [];



        for (let h = horaInicio; h <= horaFin; h++) {
            todasHoras.push(`${h.toString().padStart(2, '0')}:00:00`);
        }

        // 6. Filtrar horas disponibles
        const horasOcupadas = ocupadas.map(c => c.hora);
        const horasDisponibles = todasHoras.filter(hora => !horasOcupadas.includes(hora));


        // 7. Respuesta mejorada
        res.json({
            success: true,
            rango: servicio[0],
            ocupadas: horasOcupadas,
            disponibles: horasDisponibles,
            fechasEspeciales: fechasEspeciales
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