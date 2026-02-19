import express from "express";
import cors from "cors";
import session from 'express-session';
import { AllowedOrigins, PrimaryRuta } from "../RutaFront/Ruta.js";

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

// ✅ Configuración de sesiones DINÁMICA
app.use(session({
    secret: 'clave_secreta_segura', // ⚠️ En producción usa una variable de entorno
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60, // 1 hora
        httpOnly: true,
        // ✅ secure true si NO es localhost (para que funcionen las cookies en Railway/Netlify)

        secure: true,
        sameSite: 'none' // ✅ Permite cookies entre diferentes dominios (Railway <-> Netlify)
    }
}));



// 🔍 Middleware de debug para verificar sesiones (REMOVER EN PRODUCCIÓN)
// app.use((req, res, next) => {
//     console.log('📍 Ruta:', req.method, req.path);
//     console.log('🔑 Session ID:', req.sessionID);
//     console.log('👤 User ID en sesión:', req.session?.userId);
//     console.log('---');
//     next();
// });

app.listen(3000, () => {
    console.log("Server funciona en el puerto " + 3000);
});




