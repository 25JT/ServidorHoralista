
import { app } from "../config/Seccion.js";
import bcrypt from 'bcrypt';
import bd from "../config/Bd.js";
// login 

app.post("/login", async (req, res) => {
    try {
        const { correo, contrasena } = req.body;

        const [rows] = await bd.query(
            "SELECT id, correo, email_verificado, password, rol FROM usuario WHERE correo = ?",
            [correo]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Usuario no encontrado"
            });
        }

        const usuario = rows[0];

        const emailVerificado = usuario.email_verificado;

        if (emailVerificado !== 1) {
            return res.status(401).json({
                success: false,
                message: "Correo electrónico no verificado"
            });
        }

        const contrasenaCorrecta = await bcrypt.compare(contrasena, usuario.password);
        if (!contrasenaCorrecta) {
            return res.status(401).json({
                success: false,
                message: "Contraseña incorrecta"
            });
        }

        const [rows2] = await bd.query(
            "SELECT id FROM pservicio WHERE id_usuario = ?",
            [usuario.id]
        );

        //    console.log(rows2);


        const negocio_creado = rows2.length > 0 ? 1 : 0;

        if (negocio_creado === 1) {
            //        console.log("Negocio creado");
        } else {
            //         console.log("Negocio no creado");
        }



        // 🔽 Guardar info en la sesión
        req.session.userId = usuario.id;
        req.session.role = usuario.rol;
        req.session.negocio_creado = negocio_creado;

        // ✅ Enviar ID del usuario al frontend
        res.json({
            success: true,
            role: usuario.rol,
            id: usuario.id, // <--- este es el ID que puedes usar en el frontend
            negocio_creado: negocio_creado
        });
    } catch (error) {
        console.error("Error al iniciar sesión:", error);
        res.status(500).json({
            success: false,
            message: "Error al iniciar sesión",
            error: error.message
        });
    }
});