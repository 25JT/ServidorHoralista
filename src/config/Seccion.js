import express from "express";
import cors from "cors";
import session from 'express-session';
import cookieParser from 'cookie-parser';
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";

import { AllowedOrigins, PrimaryRuta } from "../RutaFront/Ruta.js";
dotenv.config();
export const app = express();
app.set('trust proxy', 1); // ✅ Confiar en el proxy de Railway para cookies seguras

// ✅ Configuración de CORS flexible
app.use(cors({
    origin: function (origin, callback) {
        // Permitir peticiones sin origen (como aplicaciones móviles o Postman) o de orígenes permitidos
        if (!origin || AllowedOrigins.includes(origin) || (typeof origin === 'string' && (origin.includes('localhost') || origin.includes('127.0.0.1')))) {
            callback(null, true);
        } else {
            console.log('🚫 Origen bloqueado por CORS:', origin);
            callback(new Error('No permitido por CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// ✅ Configuración de sesiones DINÁMICA
app.use(session({
    secret: process.env.SESSION_SECRET, // ⚠️ En producción usa una variable de entorno
    resave: true, // Forzar guardado para asegurar que el MaxAge se actualice
    saveUninitialized: false,
    rolling: true, // Renueva la sesión en cada petición
    name: 'session_horalista', // Nombre personalizado para evitar colisiones
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 24 horas
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/'
    }
}));
console.trace('Session cookie configured with secure: true, sameSite: none');


// 🔍 Middleware de debug para verificar sesiones (REMOVER EN PRODUCCIÓN)
// app.use((req, res, next) => {
//     console.log('📍 Ruta:', req.method, req.path);
//     console.log('🔑 Session ID:', req.sessionID);
//     console.log('👤 User ID en sesión:', req.session?.userId);
//     console.log('---');
//     next();
// });

export const server = http.createServer(app);

export const io = new Server(server, {
    cors: {
        origin: AllowedOrigins,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

app.set("io", io);

io.on("connection", (socket) => {
    console.log("🚀 [Socket.io] Nuevo cliente conectado:", socket.id);

    // Prueba inmediata de comunicación
    socket.emit("actualizar_estado_citas", { info: "Conexión inicial exitosa" });

    socket.on("disconnect", (reason) => {
        console.log("❌ [Socket.io] Cliente desconectado:", socket.id, "Motivo:", reason);
    });
});

// Heartbeat de prueba cada 10 segundos para verificar comunicación
setInterval(() => {
    if (io.sockets.sockets.size > 0) {
        //   console.log(`💓 [Socket.io] Enviando heartbeat a ${io.sockets.sockets.size} cliente(s)...`);
        io.emit("actualizar_estado_citas", { heartbeat: true, timestamp: new Date().toISOString() });
    }
}, 10000);

// El servidor se inicia ahora en server.js para asegurar que todas las rutas se registren primero.
