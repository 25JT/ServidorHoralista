import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";
import { verificarSesion } from "../middleware/autenticacion.js";

app.get("/api/usuario/obtenerImagenUsuario", verificarSesion, async (req, res) => {
    const userid = req.session.userId;
    const [rows] = await bd.query("select logo from pservicio where id_usuario = ? ", [userid]);

    if (rows.length === 0) {
        const [rows2] = await bd.query("select fotoUsuario from usuario where id = ? ", [userid]);
        res.status(200).json(rows2[0]);
    }
    if (rows.length > 0) {
        res.status(200).json(rows[0]);
    }


});