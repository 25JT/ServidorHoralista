import express from "express";
import bd from "./Bd.js";
import crypto from "crypto";
import cors from "cors";
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import session from 'express-session';
import createTransporter from './correo.js';
import cron from "node-cron";

const saltos = 10;
const ruta = "http://localhost:3000";
const RutaFront = "http://localhost:4321";// cmabiar por el dominio del front 
const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());



app.listen(3000, () => {
    console.log("Server funciona en el puerto " + ruta);
});

// Ejecutar cada minuto
cron.schedule('* * * * *', () => {
    console.log("Hora actual del servidor:", new Date().toString());
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

//funciones token con correo 

app.post("/TokenRegistro", async (req, res) => {
    const { correo, id } = req.body;

    try {
        // 1️⃣ Generar token único
        const tokenId = crypto.randomUUID();
        const expiracion = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

        // 2️⃣ Guardar en tabla token (ajusta el valor de tipo según lo permitido en tu tabla)
        await bd.query(
            `INSERT INTO token (id, id_usuario, tipo, usado, expiracion) VALUES (?, ?, 'activate_account', 0, ?)`,
            [tokenId, id, expiracion]
        );

        // 3️⃣ Preparar link de verificación
        const linkVerificacion = `${RutaFront}/verificar-email?id_token=${tokenId}`;

        // 4️⃣ Configurar correo
        const mailOptions = {
            from: process.env.correoUser,
            to: correo,
            subject: "Verifica tu correo - HORA LISTA",
            html: `
                <h1>Bienvenido a HORA LISTA</h1>
                <p>Gracias por registrarte. Por favor, verifica tu correo haciendo clic en el siguiente enlace:</p>
                <a href="${linkVerificacion}" style="color: #ffffff; background-color: #007bff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verificar mi cuenta</a>
                <p>Si no te registraste, ignora este mensaje.</p>
            `
        };

        // Envía el correo aquí (tu lógica actual)
        const transporter = await createTransporter();
        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: "Por favor revisa tu correo para verificar tu cuenta" });
    } catch (error) {
        console.error("Error al enviar correo de verificación:", error);
        res.status(500).json({ error: "Error al enviar correo de verificación" });
    }
});

//Validar tokne de registro 

app.get("/verificar-email", async (req, res) => {
    const { id_token } = req.query;

    if (!id_token) {
        return res.status(400).json({ success: false, message: "Token no proporcionado" });
    }

    try {
        const [rows] = await bd.execute(
            "SELECT * FROM token WHERE id = ? AND usado = 0 AND expiracion > NOW()",
            [id_token]
        );

        if (rows.length === 0) {
            return res.status(400).json({ success: false, message: "Token inválido o expirado" });
        }

        const verificadoUsuario = 1

        // Marcar como usado
        await bd.execute("UPDATE token SET usado = 1 WHERE id = ?", [id_token]);
        await bd.execute("UPDATE `usuario` SET `email_verificado` = ? WHERE `usuario`.`id` = ?", [verificadoUsuario, rows[0].id_usuario]);

        return res.json({ success: true, message: "Correo verificado correctamente" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Error interno" });
    }
});

//restablecer contraseña 
app.post("/restablecer-contrasena", async (req, res) => {
    const { correo } = req.body;

    try {
        const [rows] = await bd.execute(
            "SELECT * FROM usuario WHERE correo = ?",
            [correo]
        );

        if (rows.length === 0) {
            return res.status(400).json({ success: false, message: "Usuario no encontrado" });
        }

        const usuario = rows[0];

        const tokenId = crypto.randomUUID();
        const expiracion = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

        await bd.execute(
            "INSERT INTO token (id, id_usuario, tipo, usado, expiracion) VALUES (?, ?, 'reset_pass', 0, ?)",
            [tokenId, usuario.id, expiracion]
          );
          
          const linkRestablecimiento = `${RutaFront}/restablecer-contrasena?id_token=${tokenId}`;
          
          const mailOptions = {
            from: process.env.correoUser,
            to: correo,
            subject: "Restablecimiento de contraseña - HORA LISTA",
            html: `
              <h1>Restablecimiento de contraseña</h1>
              <p>Has solicitado restablecer tu contraseña. Por favor, haz clic en el siguiente enlace:</p>
              <a href="${linkRestablecimiento}" style="color: #ffffff; background-color: #007bff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Restablecer contraseña</a>
              <p>Si no solicitaste este restablecimiento, ignora este mensaje.</p>
            `
          };
          
          // ✅ crear el transporter primero
          const transporter = await createTransporter();
          await transporter.sendMail(mailOptions);
          
          return res.json({ success: true, message: "Correo de restablecimiento enviado" });
          
    } catch (error) {
        console.error("Error al restablecer contraseña:", error);
        return res.status(500).json({ success: false, message: "Error al restablecer contraseña" });
    }
});


//validar token de restablecimiento 
app.post("/cambiar-password", async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
        return res.status(400).json({ success: false, message: "Datos incompletos" });
    }

    try {
        // Validar token
        const [rows] = await bd.execute(
            "SELECT * FROM token WHERE id = ? AND usado = 0 AND expiracion > NOW()",
            [token]
        );

        if (rows.length === 0) {
            return res.status(400).json({ success: false, message: "Token inválido o expirado" });
        }

        const userId = rows[0].id_usuario;

        // Hashear nueva contraseña
        const hashedPw = await bcrypt.hash(password, 10);

        // Actualizar contraseña
        await bd.execute("UPDATE usuario SET password = ? WHERE id = ?", [hashedPw, userId]);

        // Marcar token como usado
        await bd.execute("UPDATE token SET usado = 1 WHERE id = ?", [token]);

        return res.json({ success: true, message: "Contraseña actualizada correctamente" });
    } catch (error) {
        console.error("Error al cambiar contraseña:", error);
        return res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
});

//funciones de recordatorio 



//Registro de usuario

app.post("/registro", async (req, res) => {
    try {
        const { name, lastname, email, password, role, phone } = req.body;
        //      console.log(req.body);
        // Verificar si el correo existe
        const [rows] = await bd.query(
            "SELECT * FROM usuario WHERE correo = ?",
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

        res.json({
            success: true,
            role: role,
            id: id,
            email: email,



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
            tipo_servicio,
            precio,


        } = req.body.data;
        const userid = req.body.userid;
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
              (id, id_usuario, nombre_establecimiento, telefono_establecimiento, direccion, hora_inicio, hora_fin, dias_trabajo, negocio_creado, Servicio,Precio, created_at, updated_at) 
             VALUES 
              (UUID(), ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, NOW(), NOW())`,
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

//Mostrar citas o Servicios disponibles

app.get("/serviciosDisponibles", async (req, res) => {
    try {
        const [rows] = await bd.query("SELECT * FROM pservicio");
        res.json({
            success: true,
            data: rows,
        });
    } catch (error) {
        console.error("Error al mostrar las citas:", error);
        res.status(500).json({
            success: false,
            message: "Error al mostrar las citas",
            error: error.message,
        });
    }
});
//citas en su agenda

app.post("/mostrarCitas", async (req, res) => {

    const userid = req.body.userid;

    try {
        const [rows] = await bd.query(`SELECT 
    a.id,
    a.fecha,
    a.hora,
    a.estado,
    p.nombre_establecimiento AS nombre_servicio
FROM agenda AS a
JOIN pservicio AS p 
    ON a.id_pservicio = p.id
WHERE a.id_usuario_cliente = ?
  AND a.fecha >= CURDATE()
ORDER BY a.fecha ASC, a.hora ASC;
        `, [userid]);
        res.json({
            success: true,
            data: rows,
        });
    } catch (error) {
        console.error("Error al mostrar las citas:", error);
        res.status(500).json({
            success: false,
            message: "Error al mostrar las citas",
            error: error.message,
        });
    }
});


app.post("/datosUsuario", async (req, res) => {

    try {
        const { userid, id } = req.body;
        const [rows] = await bd.query("SELECT nombre, apellidos, telefono, correo FROM `usuario` WHERE id =?", [userid]);
        const [rows2] = await bd.query("SELECT nombre_establecimiento, dias_trabajo, telefono_establecimiento, direccion FROM `pservicio` WHERE id =?", [id]);
        res.json({
            rows,
            rows2,
            success: true,
            data: rows || rows2,
        });
    } catch (error) {
        console.error("Error al mostrar los datos del usuario:", error);
        res.status(500).json({
            success: false,
            message: "Error al mostrar los datos del usuario",
            error: error.message,
        });
    }
});
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


//agendar cita

app.post("/agendarcita", async (req, res) => {
    try {
        const { userid, id, fecha, hora, mensaje, correo, nombre_establecimiento, telefono_establecimiento, nombre, apellido, direccion } = req.body;

        if (!userid || !id || !fecha || !hora) {
            return res.status(400).json({ success: false, message: "Faltan datos requeridos" });
        }

        // 1️ Verificar horario del barbero
        const [servicioRows] = await bd.query(
            "SELECT hora_inicio, hora_fin, dias_trabajo FROM pservicio WHERE id = ?",
            [id]
        );

        if (servicioRows.length === 0) {
            return res.status(404).json({ success: false, message: "Servicio no encontrado" });
        }

        const { hora_inicio, hora_fin, dias_trabajo } = servicioRows[0];

        const [anio, mes, dia] = fecha.split("-");
        const diaSemana = new Date(anio, mes - 1, dia)
            .toLocaleString("es-ES", { weekday: "long" })
            .toLowerCase();

        if (!dias_trabajo.toLowerCase().includes(diaSemana)) {
            return res.json({
                success: false,
                fechaDisponible: false,
                message: `El ${diaSemana} no está disponible. Días disponibles: ${dias_trabajo}`
            });
        }

        if (hora < hora_inicio || hora > hora_fin) {
            return res.json({
                success: false,
                horaDisponible: false,
                message: `Fuera del horario de trabajo. El horario disponible es de ${hora_inicio} a ${hora_fin}`,
                rango: { hora_inicio, hora_fin }
            });
        }

        // 2️ Verificar si ya hay cita en esa hora exacta
        const [ocupadaRows] = await bd.query(
            "SELECT 1 FROM agenda WHERE id_pservicio = ? AND fecha = ? AND hora = ? AND estado IN ('pendiente','confirmada')",
            [id, fecha, hora]
        );

        if (ocupadaRows.length > 0) {
            return res.json({ success: false, horaDisponible: false, message: "La hora ya está ocupada" });
        }

        // 3️ Verificar diferencia mínima de 1 hora con otras citas
        const [otrasCitasRows] = await bd.query(
            "SELECT hora FROM agenda WHERE id_pservicio = ? AND fecha = ? AND estado IN ('pendiente','confirmada')",
            [id, fecha]
        );

        const horaSeleccionada = new Date(`${fecha}T${hora}`);
        for (let cita of otrasCitasRows) {
            const horaExistente = new Date(`${fecha}T${cita.hora}`);
            const diferenciaHoras = Math.abs((horaSeleccionada - horaExistente) / (1000 * 60 * 60));
            if (diferenciaHoras < 1) {
                return res.json({
                    success: false,
                    horaDisponible: false,
                    message: "Debe haber al menos 1 hora entre citas"
                });
            }
        }

        // 4️ Insertar en agenda
        await bd.query(
            "INSERT INTO agenda (id, id_pservicio, id_usuario_cliente, fecha, hora, estado, notas) VALUES (UUID(), ?, ?, ?, ?, 'pendiente', ?)",
            [id, userid, fecha, hora, mensaje || ""]
        );

        // Envío de correo
        const link = `${RutaFront}/Confirmarcita?id=${id}`;
        const mensaje2 = `Gracias por agendar tu cita en ${nombre_establecimiento}`;

        // ✅ Corrección
        const transporter = await createTransporter();

        await transporter.sendMail({
            from: process.env.correoUser,
            to: correo,
            subject: `Tu cita ha sido agendada con éxito en ${nombre_establecimiento}`,
            text: mensaje2,
            html: `
    <p>Hola <b>${nombre} ${apellido}</b>,</p>
    <p>¡Gracias por confiar en <b>${nombre_establecimiento}</b>! 
    Hemos registrado tu cita para el <b>${fecha}</b> a las <b>${hora}</b>.</p>
    <p><b>Dirección:</b> ${direccion}</p>
    <p><b>Teléfono:</b> ${telefono_establecimiento}</p>
    <p>📌 Recuerda: una hora antes de tu cita recibirás un correo recordatorio para confirmar tu asistencia.</p>
    <p>❌ Si no puedes asistir, cancela la cita desde el menú de tus citas.</p>
    <p>¡Te esperamos!<br><b>${nombre_establecimiento}</b></p>
  `,
        });

        res.json({
            success: true,
            fechaDisponible: true,
            horaDisponible: true,
            message: "Cita agendada correctamente"
        });
        return;

    } catch (error) {
        console.error("Error al agendar cita:", error);
        res.status(500).json({ success: false, message: "Error interno", error: error.message });
    }
});



//Mostrar citas al prestador de servicio

app.post("/api/Reservas", async (req, res) => {
    try {
        const { userid } = req.body;
        const [id] = await bd.query("SELECT id FROM `pservicio` WHERE id_usuario = ?", [userid]);
        if (id == null) {
            return res.json({ success: false, message: "No se encontro ningun servicio" });
        }
        const idPservicio = id[0].id;
        const [rows] = await bd.query(`   SELECT
    a.hora,
    a.fecha,
    GROUP_CONCAT(a.notas) as notas,
    a.estado,
    u.nombre,
    ANY_VALUE(u.id) AS usuario_id,
    ANY_VALUE(a.id) AS agenda_id
FROM agenda AS a
JOIN usuario AS u
    ON a.id_usuario_cliente = u.id
WHERE a.id_pservicio = ?
GROUP BY a.fecha, a.hora, a.estado, u.nombre
ORDER BY a.fecha, a.hora;

`, [idPservicio]);
        res.json({
            success: true,
            data: rows,
        });
    } catch (error) {
        console.error("Error al mostrar las citas:", error);
        res.status(500).json({ success: false, message: "Error al mostrar las citas", error: error.message });
    }
})
//Canelar cita por el prestador de servicio
app.put("/api/Reservas/cancelar", async (req, res) => {
    try {
        const { Agid, Useid } = req.body;

        const [rows] = await bd.query("SELECT * FROM agenda WHERE id = ?", [Agid]);
        if (rows.length === 0) {
            return res.json({ success: false, message: "Cita no encontrada" });
        }
        
        await bd.query("UPDATE agenda SET estado = 'cancelada' , recordatorio_enviado = 1 WHERE id = ?", [Agid]);
        res.json({ success: true, message: "Cita cancelada correctamente" });
        
        const [usuario] = await bd.query("SELECT * FROM usuario WHERE id = ?", [Useid]);
        
        const mensaje = `Hola ${usuario[0].nombre}, tu cita ha sido cancelada por el prestador de servicios.`;
        
        // ✅ Crear el transporter primero
        const transporter = await createTransporter();
        
        await transporter.sendMail({
            from: process.env.correoUser,
            to: usuario[0].correo,
            subject: "Cita cancelada",
            text: mensaje,
            html: `
              <p>Hola <b>${usuario[0].nombre}</b>,</p>
              <p>Tu cita ha sido cancelada.</p>
              <p>Lo sentimos pero el prestador de servicio no estará disponible en ese momento.</p>
            `
        });
        

    } catch (error) {
        console.error("Error al cancelar la cita:", error);
        res.status(500).json({ success: false, message: "Error al cancelar la cita", error: error.message });
    }
})



// =========================
//  1. Recordatorios de citas
// =========================
async function recordatorioCitas() {
    try {
        const [rows] = await bd.query(`
        SELECT 
            a.id,
            DATE_FORMAT(a.fecha, '%d/%m/%Y') AS fecha,
            TIME_FORMAT(a.hora, '%H:%i') AS hora,
            u.nombre,
            u.correo
        FROM agenda a
        INNER JOIN usuario u 
            ON a.id_usuario_cliente = u.id
        WHERE a.estado = 'pendiente'
          AND a.recordatorio_enviado = 0
          AND TIMESTAMP(a.fecha, a.hora) >= NOW()
          AND TIMESTAMP(a.fecha, a.hora) <= DATE_ADD(NOW(), INTERVAL 1 HOUR)
      `);

        for (let row of rows) {
            const { id, fecha, hora, nombre, correo } = row;
            const link = `${RutaFront}/Confirmarcita?id=${id}`;

            const mensaje = `Hola ${nombre}, tienes una cita el ${fecha} a las ${hora}.
  Por favor confirma tu asistencia en el siguiente enlace: ${link}`;

            // ✅ Crear el transporter primero
            const transporter = await createTransporter();
            
            await transporter.sendMail({
                from: process.env.correoUser,
                to: correo,
                subject: "Recordatorio de cita",
                text: mensaje,
                html: `<p>Hola <b>${nombre}</b>,</p>
                 <p>Tienes una cita el <b>${fecha}</b> a las <b>${hora}</b>.</p>
                 <p>Por favor confirma tu asistencia haciendo clic en el siguiente botón:</p>
                 <p><a href="${link}" style="background:#4CAF50;color:white;padding:10px 15px;text-decoration:none;border-radius:5px;">Confirmar cita</a></p>`
            });

            // Actualizar la agenda después de enviar
            await bd.query(
                `UPDATE agenda 
           SET recordatorio_enviado = 1, recordatorio_enviado_at = NOW() 
           WHERE id = ?`,
                [id]
            );
        }

        if (rows.length > 0) {
            console.log(`📩 Recordatorios enviados: ${rows.length}`);
        }

    } catch (error) {
        console.error("❌ Error en recordatorioCitas:", error);
    }
}


// =========================
// 📌 2. Limpieza de tokens expirados
// =========================
async function limpiarTokens() {
    try {
        const [result] = await bd.execute(
            "DELETE FROM token WHERE expiracion < NOW()"
        );
        if (result.affectedRows > 0) {
            console.log(`🧹 Tokens eliminados: ${result.affectedRows}`);
        }
    } catch (err) {
        console.error("❌ Error eliminando tokens:", err);
    }
}


// =========================
// ⏰ Programar cron jobs
// =========================

// 📌 Recordatorios → cada hora en el minuto 0
cron.schedule("* * * * *", () => {
    console.log("⏰ Ejecutando recordatorio de citas...");
    recordatorioCitas();
});

// 📌 Limpieza de tokens → todos los días a las 2 AM
cron.schedule("0 2 * * *", () => {
    console.log("🧹 Ejecutando limpieza de tokens...");
    limpiarTokens();
});

console.log("✅ Cron jobs activos");



//confirmacion de cita usuario
app.post("/confirmar-cita", async (req, res) => {
    const { id } = req.body;

    console.log(id);
    try {
        const [result] = await bd.query(
            `UPDATE agenda 
SET confirmada_por_cliente = 1, 
    confirmada_at = NOW(), 
    estado = 'confirmada'
WHERE id = ?;
`,
            [id]
        );

        if (result.affectedRows > 0) {
            res.json({ success: true, message: "Cita confirmada" });
        } else {
            res.status(404).json({ success: false, message: "Cita no encontrada" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error en el servidor" });
    }
});

//cancelar cita de usuario por su cliente
app.post("/cancelar-cita", async (req, res) => {
    const { id } = req.body;

    console.log("ID recibido para cancelar:", id);

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
        
            console.log("✅ Correos enviados exitosamente");
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

