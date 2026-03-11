
import { app } from "../config/Seccion.js";
import bcrypt from 'bcrypt';
import bd from "../config/Bd.js";
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
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
                message: "Contraseña incorrecta o correo electrónico no válido"
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

        // 🆔 Generar Persistent Token (Remember Me)
        // Limpiar solo tokens expirados para no cerrar sesión en otros dispositivos
        await bd.query("DELETE FROM remember_token_seccion WHERE expires_at < NOW()");

        const persistentToken = uuidv4();
        const tokenHash = crypto.createHash('sha256').update(persistentToken).digest('hex');
        const tokenExpiracion = new Date();
        tokenExpiracion.setDate(tokenExpiracion.getDate() + 30); // 30 días

        await bd.query(
            "INSERT INTO remember_token_seccion (id, id_usuario, token_hash, expires_at) VALUES (?, ?, ?, ?)",
            [uuidv4(), usuario.id, tokenHash, tokenExpiracion.toISOString().slice(0, 19).replace('T', ' ')]
        );

        res.cookie('remember_token', persistentToken, {
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
            httpOnly: true,
            secure: true, // ✅ Obligatorio para cross-site (Railway <-> Netlify)
            sameSite: 'none', // ✅ Obligatorio para cross-site
            path: '/'
        });

        // 🔍 Debug: Verificar que la sesión se guardó
        console.log('✅ Login exitoso - Sesión creada y Token emitido:');
        console.log('   User ID:', req.session.userId);

        // ✅ Forzar guardado de sesión antes de responder
        req.session.save((err) => {
            if (err) {
                console.error('❌ Error al guardar sesión:', err);
                return res.status(500).json({ success: false, message: "Error al guardar sesión" });
            }
            // ✅ Enviar respuesta
            res.json({
                success: true,
                role: usuario.rol,
                id: usuario.id,
                negocio_creado: negocio_creado
            });
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