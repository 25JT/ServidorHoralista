import "./holamundo.js";
import "./src/Tokens/Token.js";
import "./src/Login/Login.js";
import "./src/Registro/RegistroUsuario.js";
import "./src/Disponibilidad Citas datos usuario/DatosUsuario.js";
import "./src/Disponibilidad Citas datos usuario/mostrarCitas.js";
import "./src/Disponibilidad Citas datos usuario/ServiciosDisponibles.js";
import "./src/agenda/AgendarCita.js";

import "./src/Disponibilidad Citas datos usuario/RecodrdatoriosCitas.js";
import "./src/Reservas/Reservas.js";
import "./src/Reservas/CancelarReservas.js";
import "./src/Tokens/LimpiezaTokens.js";
import "./src/Disponibilidad Citas datos usuario/confirmarcitas.js";
import "./src/Disponibilidad Citas datos usuario/CancelarCita.js";
import "./src/sliderBar/NombreUser.js";
import "./src/RegistroNegocio/RegistroNegocio.js";



//const RutaFront = "http://localhost:4321";
const RutaFront = "https://fromprueba-production.up.railway.app";// cmabiar por el dominio del front 



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
            "SELECT hora_inicio, hora_fin FROM pservicio WHERE id = ?",
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

        // 4. Generar todas las horas posibles en el rango
        const horaInicio = parseInt(servicio[0].hora_inicio.split(':')[0]);
        const horaFin = parseInt(servicio[0].hora_fin.split(':')[0]);

        const todasHoras = [];
        for (let h = horaInicio; h <= horaFin; h++) {
            todasHoras.push(`${h.toString().padStart(2, '0')}:00:00`);
        }

        // 5. Filtrar horas disponibles
        const horasOcupadas = ocupadas.map(c => c.hora);
        const horasDisponibles = todasHoras.filter(hora => !horasOcupadas.includes(hora));

        // 6. Respuesta mejorada
        res.json({
            success: true,
            rango: servicio[0],
            ocupadas: horasOcupadas,
            disponibles: horasDisponibles
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