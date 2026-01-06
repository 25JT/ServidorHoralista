import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";
import { verificarSesion } from "../middleware/autenticacion.js";

//SLIDERBAR FUNCIONES

// ✅ Protegido con middleware de autenticación
app.post("/nombreUser", verificarSesion, async (req, res) => {
    // ✅ Usar el userId de la sesión (fuente de verdad)
    const userid = req.session.userId;

    const [rows] = await bd.query("select correo, nombre from usuario where id = ? ", [userid]);
    //  console.log(rows);
    res.json(rows[0]);
});