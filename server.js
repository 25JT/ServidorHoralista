import express from "express";
import bd from "./Bd.js";
import cors from "cors";
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import session from 'express-session';
// import transporter from './correo.js'; no esta creado en esta version
const saltos = 10;
const ruta = "http://localhost:3000";

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


app.listen(3000, () => {
    console.log("Server funciona en el puerto " + ruta);
});

// sesion


app.use(session({
    secret: 'clave_secreta_segura',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60, // 1 hora
    }
}));


//verificar sesion
function verificarSesion(req, res, next) {
    if (req.session && req.session.usuarioId) {
        next(); // Usuario autenticado, continuar
    } else {
        res.status(401).json({ mensaje: 'No autorizado. Inicia sesión primero.' });
    }
}


app.get("/", (req, res) => {
    res.json({ message: "Hola mundo" })
});

app.post("/registro", async (req, res) => {
    try {
        const { name, lastname, email, password, role, phone } = req.body;
        console.log(req.body);
        // Generar UUID
        const id = uuidv4();

        // Encriptar contraseña
        const contrasenaEncriptada = await bcrypt.hash(password, saltos);

        // Guardar en base de datos
        await bd.query(
            "INSERT INTO usuario (id, correo, password, nombre, apellidos ,telefono , rol ) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [id, email, contrasenaEncriptada, name, lastname, phone, role]
        );

        res.json({
            success: true,
            role: role
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


// login 

app.post("/login", async (req, res) => {
    try {
        const { correo, contrasena } = req.body;

        const [rows] = await bd.query(
            "SELECT * FROM usuario WHERE correo = ?",
            [correo]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Usuario no encontrado"
            });
        }

        const usuario = rows[0];

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

          console.log(rows2);
          
          
          const negocio_creado = rows2.length > 0 ? 1 : 0;
          
          if (negocio_creado === 1) {
            console.log("Negocio creado");
          } else {
            console.log("Negocio no creado");
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

// Cerrar sesión
app.post("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Error al cerrar sesión:", err);
            return res.status(500).json({
                success: false,
                message: "Error al cerrar sesión"
            });
        }

        res.clearCookie('connect.sid'); // borra la cookie de sesión
        res.json({
            success: true,
            message: "Sesión cerrada correctamente"
        });
    });
});


//registro negocio

app.post("/registroNegocio", async (req, res) => {
    try {
        const {
            nombre_establecimiento,
            telefono_establecimiento,
            direccion,
            hora_inicio,
            hora_fin,
            dias_trabajo,
            
        } = req.body.data;
        const userid = req.body.userid;
        
        
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
              (id, id_usuario, nombre_establecimiento, telefono_establecimiento, direccion, hora_inicio, hora_fin, dias_trabajo, negocio_creado, created_at, updated_at) 
             VALUES 
              (UUID(), ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
            [
              userid,
              nombre_establecimiento,
              telefono_establecimiento,
              direccion,
              hora_inicio,
              hora_fin,
              dias,
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


