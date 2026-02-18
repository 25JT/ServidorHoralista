import { app } from "../config/Seccion.js"
import bd from "../config/Bd.js";
import { verificarAutenticacionYPropietario } from "../middleware/autenticacion.js"

app.post("/api/tienda/identidad/guardar", verificarAutenticacionYPropietario, async (req, res) => {
    const { tituloTienda, direccionTienda, descripcionTienda } = req.body;
    const userid = req.session.userId;
    const [rows] = await bd.query("update pservicio set nombre_establecimiento = ?, direccion = ?, descripcion = ? where id_usuario = ? ;", [tituloTienda, direccionTienda, descripcionTienda, userid])
    res.status(200).json({ succes: true, rows })
})