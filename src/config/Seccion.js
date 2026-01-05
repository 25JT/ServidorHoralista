import express from "express";
import cors from "cors";
import session from 'express-session';


const ruta = "http://localhost:3000";


export const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.listen(3000, () => {
    //  console.log("Server funciona en el puerto " + ruta);
});

// sesion abierta 

app.use(session({
    secret: 'clave_secreta_segura',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60, // 1 hora
    }
}));



