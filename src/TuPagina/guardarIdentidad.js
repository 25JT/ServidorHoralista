import { app } from "../config/Seccion.js"
import bd from "../config/Bd.js";
import { veriverificarAutenticacionYPropietarioficarSesion } from "../middleware/autenticacion.js"

app.post("/api/tienda/identidad", veriverificarAutenticacionYPropietarioficarSesion , async (req, res) => {

})