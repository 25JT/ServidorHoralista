
import bd from "../config/Bd.js";
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// Ayudante para hashear tokens
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export async function verificarSesion(req, res, next) {
    // console.log(`[SessionCheck] Origin: ${req.headers.origin} - Cookies:`, req.cookies);

    // 1. Si ya tiene sesión activa, continuar
    if (req.session && req.session.userId) {
        // console.log(`[SessionCheck] Sesión activa para usuario: ${req.session.userId}`);
        return next();
    }

    // 2. Si no hay sesión, buscar el cookie remember_token
    const token = req.cookies.remember_token;
    if (token) {
        try {
            const tokenHash = hashToken(token);
            // console.log(`[SessionCheck] Buscando token hash: ${tokenHash}`);

            const [rows] = await bd.query(
                "SELECT id_usuario FROM remember_token_seccion WHERE token_hash = ? AND expires_at > NOW()",
                [tokenHash]
            );

            if (rows.length > 0) {
                const userId = rows[0].id_usuario;

                // Recuperar datos del usuario para reconstruir la sesión
                const [userRows] = await bd.query(
                    "SELECT id, rol FROM usuario WHERE id = ?",
                    [userId]
                );

                if (userRows.length > 0) {
                    const usuario = userRows[0];
                    const [pservRows] = await bd.query(
                        "SELECT id FROM pservicio WHERE id_usuario = ?",
                        [userId]
                    );

                    // Reconstruir sesión
                    req.session.userId = usuario.id;
                    req.session.role = usuario.rol;
                    req.session.negocio_creado = pservRows.length > 0 ? 1 : 0;

                    // Rotar Token (Seguridad)
                    const nuevoToken = uuidv4();
                    const nuevoHash = hashToken(nuevoToken);
                    const expiracion = new Date();
                    expiracion.setDate(expiracion.getDate() + 30); // 30 días

                    await bd.query(
                        "UPDATE remember_token_seccion SET token_hash = ?, expires_at = ? WHERE token_hash = ?",
                        [nuevoHash, expiracion.toISOString().slice(0, 19).replace('T', ' '), tokenHash]
                    );

                    res.cookie('remember_token', nuevoToken, {
                        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
                        httpOnly: true,
                        secure: true,
                        sameSite: 'none',
                        path: '/'
                    });

                    //  console.log(`[RememberMe] Sesión restaurada y token rotado para el usuario: ${userId}`);

                    // Guardar explícitamente para evitar problemas de concurrencia
                    return req.session.save(() => next());
                }
            } else {
                // console.log(`[SessionCheck] Token no encontrado o expirado`);
            }
        } catch (error) {
            console.error("Error en auto-login persistent:", error);
        }
    }

    // 3. Si nada funcionó, error 401
    return res.status(401).json({
        success: false,
        message: "No estás autenticado. Por favor inicia sesión."
    });
}

/**
 * Middleware de autorización
 * Verifica que el usuario autenticado sea el dueño de los datos que intenta modificar
 */
export function verificarPropietario(req, res, next) {
    const { userid } = req.body;
    const usuarioAutenticado = req.session.userId;

    // Validar que el userid del body coincida con el usuario en sesión
    if (!userid || userid !== usuarioAutenticado) {
        return res.status(403).json({
            success: false,
            message: "No tienes permiso para modificar estos datos."
        });
    }

    next();
}

/**
 * Middleware combinado: verifica sesión y propiedad
 */
export function verificarAutenticacionYPropietario(req, res, next) {
    // Primero verificar que esté autenticado
    if (!req.session || !req.session.userId) {
        return res.status(401).json({
            success: false,
            message: "No estás autenticado. Por favor inicia sesión."
        });
    }

    const { userid } = req.body;
    const usuarioAutenticado = req.session.userId;

    // Luego verificar que sea el propietario
    if (!userid || userid !== usuarioAutenticado) {
        return res.status(403).json({
            success: false,
            message: "No tienes permiso para modificar estos datos."
        });
    }

    next();
}


export function verificarNotificacion(req, res, next) {
    const id_notificacion = req.session.id_notificacion;
    const id_notificacion_front = req.body.id;
    if (id_notificacion !== id_notificacion_front) {
        return res.status(403).json({
            success: false,
            message: "No tienes permiso para modificar estos datos."
        });
    }
    next();
}