import { app } from "../config/Seccion.js"
import bd from "../config/Bd.js";
import { verificarSesion } from "../middleware/autenticacion.js"

app.get("/api/tienda/identidad", verificarSesion, async (req, res) => {

    const userid = req.session.userId;
    try {
        const [rows] = await bd.query("select nombre_establecimiento, telefono_establecimiento, direccion,descripcion,logo, banner from pservicio where id_usuario = ? ;", [userid])
        res.status(200).json({ succes: true, rows })
    } catch {
        res.status(500).json({ succes: false, message: "Error al obtener la identidad" })
    }


})
