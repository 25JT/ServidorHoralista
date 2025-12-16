import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";

//SLIDERBAR FUNCIONES

app.post("/nombreUser", async (req, res) => {
    const { userid } = req.body;
    const [rows] = await bd.query("select correo, nombre from usuario where id = ? ", [userid]);
    //  console.log(rows);
    res.json(rows[0]);
});