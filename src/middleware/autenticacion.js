/**
 * Middleware de autenticación
 * Verifica que el usuario esté autenticado mediante la sesión
 */
export function verificarSesion(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({
            success: false,
            message: "No estás autenticado. Por favor inicia sesión."

        });
    }
    next();
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
