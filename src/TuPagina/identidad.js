import { app } from "../config/Seccion.js"
import bd from "../config/Bd.js";
import { verificarSesion } from "../middleware/autenticacion.js"

app.get("/api/tienda/identidad", verificarSesion, async (req, res) => {
    const userid = req.session.userId;
    const [rows] = await bd.query("select nombre_establecimiento,direccion,descripcion from pservicio where id_usuario = ? ;", [userid])
    res.status(200).json({ succes: true, rows })

})
