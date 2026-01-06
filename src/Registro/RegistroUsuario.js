import { app } from "../config/Seccion.js";
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import bd from "../config/Bd.js";
//Registro de usuario

const saltos = 10;

app.post("/registro", async (req, res) => {
    try {
        const { name, lastname, email, password, role, phone } = req.body;
        //      console.log(req.body);
        // Verificar si el correo existe
        const [rows] = await bd.query(
            "SELECT correo, id FROM usuario WHERE correo = ?",
            [email]
        );
        if (rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: "El correo electrónico ya está en uso. Por favor, elija otro o recupere la contraseña"
            });
        }

        // Generar UUID
        const id = uuidv4();

        // Encriptar contraseña
        const contrasenaEncriptada = await bcrypt.hash(password, saltos);

        // Guardar en base de datos
        await bd.query(
            "INSERT INTO usuario (id, correo, password, nombre, apellidos ,telefono , rol ) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [id, email, contrasenaEncriptada, name, lastname, phone, role]
        );

        // 🔽 Iniciar sesión automáticamente después del registro
        req.session.userId = id;
        req.session.role = role;
        req.session.negocio_creado = 0;

        req.session.save((err) => {
            if (err) {
                console.error('❌ Error al guardar sesión en registro:', err);
            }
            res.json({
                success: true,
                role: role,
                id: id,
                email: email,
            });
        });


    } catch (error) {
        console.error("Error al registrar el usuario:", error);
        res.status(500).json({
            success: false,
            message: "Error al registrar el usuario",
            error: error.message
        });
    }
});