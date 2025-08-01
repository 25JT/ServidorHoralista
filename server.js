import express from "express";
import bd from "./Bd.js";
import cors from "cors";
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
// import transporter from './correo.js'; no esta creado en esta version
const saltos = 10;
const ruta = "http://localhost:3000";

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


app.listen(3000, () => {
    console.log("Server funciona en el puerto " + ruta);
});


app.get("/", (req, res) => {
    res.json({ message: "Hola mundo" })
});

app.post("/registro", async (req, res) => {
    try {
        const { name, lastname, email, password, role, phone } = req.body;
console.log(req.body);
        // Generar UUID
        const id = uuidv4();

        // Encriptar contraseña
        const contrasenaEncriptada = await bcrypt.hash(password, saltos);

        // Guardar en base de datos
        await bd.query(
            "INSERT INTO usuario (id, correo, password, nombre, apellidos ,telefono , rol ) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [id, email, contrasenaEncriptada, name, lastname, phone, role]
        );

        res.json({
            success: true,
            role: role
        });

    } catch (error) {
        console.error("Error al registrar el usuario:", error);
        res.status(500).json({
            success: false,
            message: "Error al registrar el usuario",
            error: error.message
        });
    }
});
