
import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";
import { verificarSesion } from "../middleware/autenticacion.js";

//registro negocio
// ✅ Protegido con middleware de autenticación
app.post("/registroNegocio", verificarSesion, async (req, res) => {
    try {
        const {
            nombre_establecimiento,
            telefono_establecimiento,
            direccion,
            hora_inicio,
            hora_fin,
            dias_trabajo,
            tipo_servicio,
            precio,
            duracion,


        } = req.body.data;

        // ✅ Usar el userId de la sesión (fuente de verdad)
        const userid = req.session.userId;
        //     console.log(req.body);

        if (!userid) {
            return res.status(400).json({
                success: false,
                message: "El ID del usuario es requerido",
            });
        }

        // Convertir a string si se recibe como array
        const dias = Array.isArray(dias_trabajo)
            ? dias_trabajo.join(",")
            : typeof dias_trabajo === "string"
                ? dias_trabajo
                : null;
        // console.log( req.body.data);

        const [result] = await bd.execute(
            `INSERT INTO pservicio 
              (id, id_usuario, nombre_establecimiento, telefono_establecimiento, direccion, hora_inicio, hora_fin, dias_trabajo, negocio_creado, Servicio,Precio, intervaloCitas, created_at, updated_at) 
             VALUES 
              (UUID(), ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, NOW(), NOW())`,
            [
                userid,
                nombre_establecimiento,
                telefono_establecimiento,
                direccion,
                hora_inicio,
                hora_fin,
                dias,
                tipo_servicio,
                precio,
                duracion,
            ]
        );

        res.json({
            success: true,
            message: "Negocio registrado exitosamente",
            data: result,
        });

    } catch (error) {
        console.error("Error al registrar el negocio:", error);
        res.status(500).json({
            success: false,
            message: "Error al registrar el negocio",
            error: error.message,
        });
    }
});