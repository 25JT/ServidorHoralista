import { app } from "../config/Seccion.js";
import { verificarSesion } from "../middleware/autenticacion.js";

/**
 * Endpoint para que el frontend verifique si hay una sesión activa al cargar la página.
 * Gracias al middleware verificarSesion, si la sesión de Express expiró pero hay un remember_token válido,
 * la sesión se restaurará automáticamente antes de llegar aquí.
 */
app.get("/api/verificar-estado", verificarSesion, (req, res) => {
    res.json({
        success: true,
        authenticated: true,
        usuario: {
            id: req.session.userId,
            rol: req.session.role,
            negocio_creado: req.session.negocio_creado
        }
    });
});
