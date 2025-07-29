import express from "express";
//import  connection from "./Bd.js"; BD NO CREADA EN ESTE version
import cors from "cors";
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
// import transporter from './correo.js'; no esta creado en esta version

const ruta =  "http://localhost:3000";

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


app.listen(3000, () => {
    console.log("Server funciona en el puerto " + ruta);
});


app.get("/", (req, res) => {
    res.send("Hola mundo");
});

