import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";
import { verificarSesion } from "../middleware/autenticacion.js";
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from "baileys";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import pino from "pino";



// Almacén de sesiones activas
export const sessions = new Map();
export let negocio_id = null;

// Logger para Baileys (nivel silent para eliminar ruidos internos de la librería)
const logger = pino({ level: "silent" });

export async function connectToWhatsApp(userid, negocio_id, res = null) {
    const sessionDir = path.join(process.cwd(), "whatsapp_sessions", `session_${negocio_id}`);

    // Asegurar que el directorio existe
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }

    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir, { logger });

        // En Baileys versión 7+, la exportación por defecto suele ser la función misma
        const makeWASocketFunc = makeWASocket.default || makeWASocket;
        const sock = makeWASocketFunc({
            auth: state,
            printQRInTerminal: false,
            logger: logger, // Pasar el logger configurado aquí
        });

        sessions.set(negocio_id, sock);

        sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr && res) {
                try {
                    const qrBase64 = await QRCode.toDataURL(qr);
                    if (!res.headersSent) {
                        res.status(200).json({
                            success: true,
                            qr: qrBase64,
                            message: "Escanea el código QR para vincular WhatsApp"
                        });
                    }
                } catch (err) {
                    console.error("Error generando QR Base64:", err);
                    if (!res.headersSent) {
                        res.status(500).json({ success: false, message: "Error al generar el código QR" });
                    }
                }
            }

            if (connection === "close") {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                if (shouldReconnect) {
                    console.error(`[Aviso] Conexión perdida para negocio ${negocio_id}. Intentando reconectar...`);
                    // Reintentar conexión con el mismo userid
                    connectToWhatsApp(userid, negocio_id);
                } else {
                    console.error(`[CRÍTICO] Sesión cerrada permanentemente para negocio ${negocio_id}. El usuario cerró la sesión desde el teléfono.`);

                    // Limpiar BD y archivos locales
                    try {
                        await bd.execute("DELETE FROM registro_envios_wpp WHERE id_pservicio = ?", [negocio_id]);
                        console.log(`Registro de BD eliminado para negocio: ${negocio_id}`);
                    } catch (dbErr) {
                        console.error("Error eliminando registro de BD:", dbErr);
                    }

                    fs.rmSync(sessionDir, { recursive: true, force: true });
                    sessions.delete(negocio_id);
                }
            } else if (connection === "open") {
                console.log(`WhatsApp conectado exitosamente para el negocio: ${negocio_id}`);


                // Guardar o actualizar en la BD
                try {
                    const [existing] = await bd.execute("SELECT id FROM registro_envios_wpp WHERE id_pservicio = ?", [negocio_id]);
                    if (existing.length === 0) {
                        const tokenId = crypto.randomUUID();
                        const socketId = sock.user.id;
                        await bd.execute(
                            "INSERT INTO registro_envios_wpp (id, id_pservicio, id_usuario, id_socket, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())",
                            [tokenId, negocio_id, userid, socketId]
                        );
                        console.log(`Nuevo registro de vinculación (Socket: ${socketId}) creado en BD para negocio: ${negocio_id}`);
                    } else {
                        await bd.execute(
                            "UPDATE registro_envios_wpp SET updated_at = NOW() WHERE id_pservicio = ?",
                            [negocio_id]
                        );
                        console.log(`Registro de vinculación actualizado en BD para negocio: ${negocio_id}`);
                    }
                } catch (dbErr) {
                    console.error("Error al persistir en registro_envios_wpp:", dbErr);
                }

                if (res && !res.headersSent) {
                    // NOTA: Esta respuesta solo se envía si la sesión ya estaba abierta desde el principio.
                    // Si se envió un QR antes, esta parte no se ejecutará porque la petición HTTP ya terminó.
                    console.log(`[HTTP] Confirmando conexión abierta para negocio: ${negocio_id}`);
                    res.status(200).json({ success: true, message: "WhatsApp conectado" });
                } else if (res && res.headersSent) {
                    console.log(`[Aviso] Conexión abierta para ${negocio_id}, pero la respuesta HTTP ya fue enviada (probablemente con un QR). El frontend debe detectar el cambio vía /estadoWhatsApp.`);
                }
            }
        });

        sock.ev.on("creds.update", saveCreds);

        return sock;
    } catch (error) {
        console.error(`[Error Fatídico] No se pudo inicializar WhatsApp para negocio ${negocio_id}:`, error.message);
        if (res && !res.headersSent) {
            res.status(500).json({
                success: false,
                message: "Error al inicializar la sesión de WhatsApp. Es posible que los archivos de sesión estén dañados."
            });
        }
        return null;
    }
}

export function VincularWhatsApp() {
    app.post("/vincularWhatsApp", verificarSesion, async (req, res) => {
        try {
            const userid = req.session.userId;
            const [rows] = await bd.execute("SELECT id FROM pservicio WHERE id_usuario = ?", [userid]);

            if (rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: "Negocio no encontrado para este usuario"
                });
            }

            const negocio_id = rows[0].id;

            if (sessions.has(negocio_id)) {
                const sock = sessions.get(negocio_id);
                if (sock.user) {
                    return res.status(200).json({
                        success: true,
                        message: "WhatsApp ya está vinculado",
                        alreadyConnected: true
                    });
                }
            }

            await connectToWhatsApp(userid, negocio_id, res);
            // No enviar respuesta aquí, connectToWhatsApp se encarga vía el objeto 'res' en los eventos
        } catch (error) {
            console.error("Error en /vincularWhatsApp:", error);
            if (!res.headersSent) {
                res.status(500).json({ error: "Error interno del servidor", success: false });
            }
        }
    });

    app.get("/estadoWhatsApp", verificarSesion, async (req, res) => {
        try {
            const userid = req.session.userId;
            const [rows] = await bd.execute("SELECT id FROM pservicio WHERE id_usuario = ?", [userid]);
            if (rows.length === 0) return res.status(404).json({ success: false });

            const negocio_id = rows[0].id;
            const isConnected = sessions.has(negocio_id) && sessions.get(negocio_id).user;

            // console.log("WhatsApp conectado:", isConnected);

            res.status(200).json({
                success: true,
                connected: !!isConnected,
                message: isConnected ? "WhatsApp conectado" : "WhatsApp desconectado"
            });
        } catch (error) {
            res.status(500).json({ success: false });
        }
    });

    // Nuevo endpoint para desvincular explícitamente
    app.post("/desvincularWhatsApp", verificarSesion, async (req, res) => {
        try {
            const userid = req.session.userId;
            const [rows] = await bd.execute("SELECT id FROM pservicio WHERE id_usuario = ?", [userid]);
            if (rows.length === 0) return res.status(404).json({ success: false, message: "Negocio no encontrado" });

            const negocio_id = rows[0].id;
            const sessionDir = path.join(process.cwd(), "whatsapp_sessions", `session_${negocio_id}`);

            if (sessions.has(negocio_id)) {
                const sock = sessions.get(negocio_id);
                await sock.logout(); // Esto disparará connection.update con 'close' y LoggedOut
                sessions.delete(negocio_id);
            }

            // Limpieza manual de seguridad
            await bd.execute("DELETE FROM registro_envios_wpp WHERE id_pservicio = ?", [negocio_id]);
            if (fs.existsSync(sessionDir)) {
                fs.rmSync(sessionDir, { recursive: true, force: true });
            }

            res.status(200).json({ success: true, message: "WhatsApp desvinculado correctamente" });
        } catch (error) {
            console.error("Error al desvincular:", error);
            res.status(500).json({ success: false, message: "Error al desvincular" });
        }
    });
}


// Función para inicializar sesiones existentes al arrancar
async function inicializarSesionesAlArranque() {
    try {
        const rootDir = path.join(process.cwd(), "whatsapp_sessions");
        if (!fs.existsSync(rootDir)) return;

        const sessionFolders = fs.readdirSync(rootDir);

        for (const folder of sessionFolders) {
            if (folder.startsWith("session_")) {
                const negocio_id = folder.replace("session_", "");
                const sessionPath = path.join(rootDir, folder);
                const credsPath = path.join(sessionPath, "creds.json");

                // Verificar si existe el archivo de credenciales para evitar el error ENOENT
                if (!fs.existsSync(credsPath)) {
                    console.log(`[Arranque] Saltando sesión ${negocio_id} porque no tiene creds.json (posible vinculación incompleta).`);
                    continue;
                }

                // Obtener el userid asociado a este negocio desde la BD
                const [rows] = await bd.execute("SELECT id_usuario FROM registro_envios_wpp WHERE id_pservicio = ?", [negocio_id]);

                if (rows.length > 0) {
                    const userid = rows[0].id_usuario;
                    console.log(`Restaurando sesión de WhatsApp para negocio ${negocio_id}...`);

                    connectToWhatsApp(userid, negocio_id).catch(err => {
                        console.error(`Error restaurando sesión para ${negocio_id}:`, err);
                    });
                }
            }
        }
    } catch (error) {
        console.error("Error al inicializar sesiones al arranque:", error);
    }
}

VincularWhatsApp();
inicializarSesionesAlArranque();
