import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";
import createTransporter from "../config/correo.js";



//cancelar cita de usuario por su cliente
app.post("/cancelar-cita", async (req, res) => {
    const { id } = req.body;

    const validacion = await bd.query(
        `select confirmada_por_cliente, estado , id from horalista.agenda where id = ?;`,
        [id]
    );

    if (validacion[0][0].confirmada_por_cliente === 1) {
        return res.status(400).json({ success: false, message: "El usuario ya confirmo la cita esta en un estado de " + validacion[0][0].estado });
    }

    try {
        // Primero obtener los datos de la cita antes de actualizar
        const [citaData] = await bd.query(
            `
        SELECT 
            cliente.nombre AS nombre_cliente,
            cliente.correo AS correo_cliente,
            prestador.nombre AS nombre_prestador,
            prestador.correo AS correo_prestador,
            a.fecha,
            a.hora,
            a.estado
        FROM agenda AS a
        JOIN usuario AS cliente 
            ON a.id_usuario_cliente = cliente.id
        JOIN pservicio AS ps 
            ON a.id_pservicio = ps.id
        JOIN usuario AS prestador
            ON ps.id_usuario = prestador.id
        WHERE a.id = ?;
        `,
            [id]
        );



        if (!citaData.length) {
            return res.status(404).json({ success: false, message: "Cita no encontrada" });
        }

        const datos = citaData[0];

        // Verificar si la cita ya está cancelada
        if (datos.estado === 'cancelada') {
            return res.status(400).json({ success: false, message: "La cita ya está cancelada" });
        }

        // Actualizar la cita
        const [result] = await bd.query(
            `UPDATE agenda 
          SET confirmada_por_cliente = 1, 
              confirmada_at = NOW(), 
              estado = 'cancelada'
          WHERE id = ?;`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Cita no encontrada" });
        }

        // Validar y formatear fecha y hora
        let fechaFormateada = "fecha no disponible";
        let horaFormateada = "hora no disponible";

        try {
            // Validar que fecha y hora existan y sean válidas
            if (datos.fecha && datos.hora) {
                // Asegurar el formato correcto de la hora
                let horaCompleta = datos.hora.toString(); // Convertir a string por si acaso
                if (horaCompleta.split(':').length === 2) {
                    horaCompleta += ':00'; // Agregar segundos si faltan
                }

                // Formatear fecha para ISO (YYYY-MM-DD)
                const fechaISO = datos.fecha instanceof Date ?
                    datos.fecha.toISOString().split('T')[0] :
                    datos.fecha;

                const fechaCita = new Date(`${fechaISO}T${horaCompleta}`);

                // Validar que la fecha sea válida
                if (!isNaN(fechaCita.getTime())) {
                    fechaFormateada = new Intl.DateTimeFormat("es-CO", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                    }).format(fechaCita);

                    horaFormateada = new Intl.DateTimeFormat("es-CO", {
                        hour: "numeric",
                        minute: "numeric",
                        hour12: true,
                    }).format(fechaCita);
                } else {
                    console.warn("Fecha inválida:", datos.fecha, datos.hora);
                }
            }
        } catch (dateError) {
            console.error("Error al formatear fecha:", dateError);
            // Usar los valores originales si hay error
            fechaFormateada = datos.fecha || "fecha no disponible";
            horaFormateada = datos.hora || "hora no disponible";
        }

        // Mensaje para el cliente
        const mensajeCliente = {
            from: process.env.correoUser,
            to: datos.correo_cliente,
            subject: "Cita cancelada",
            html: `
          <p>Hola <b>${datos.nombre_cliente}</b>,</p>
          <p>Tu cita programada para el día <b>${fechaFormateada}</b> a las <b>${horaFormateada}</b> 
          con <b>${datos.nombre_prestador}</b> ha sido 
          <span style="color:red;">CANCELADA</span>.</p>
          <p>Gracias por usar nuestro servicio.</p>
        `,
        };

        // Mensaje para el prestador
        const mensajePrestador = {
            from: process.env.correoUser,
            to: datos.correo_prestador,
            subject: "Notificación de cancelación de cita",
            html: `
          <p>Hola <b>${datos.nombre_prestador}</b>,</p>
          <p>El cliente <b>${datos.nombre_cliente}</b> ha cancelado la cita programada 
          para el día <b>${fechaFormateada}</b> a las <b>${horaFormateada}</b>.</p>
          <p>Por favor, actualiza tu agenda.</p>
        `,
        };

        // Enviar correos (no bloquear la respuesta principal)
        try {
            const transporter = await createTransporter();

            await Promise.all([
                transporter.sendMail(mensajeCliente),
                transporter.sendMail(mensajePrestador)
            ]);

            //    console.log("✅ Correos enviados exitosamente");
        } catch (emailError) {
            console.error("Error enviando correos:", emailError);
            // No fallar la operación principal por errores de correo
        }

        res.json({ success: true, message: "Cita cancelada exitosamente" });

    } catch (error) {
        console.error("Error en cancelar-cita:", error);

        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: "Error en el servidor al cancelar la cita"
            });
        }
    }
});