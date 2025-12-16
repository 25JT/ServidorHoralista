import { app } from "./src/config/Seccion.js";


app.get("/", (req, res) => {
    res.json({ message: "Hola mundo" })
});
