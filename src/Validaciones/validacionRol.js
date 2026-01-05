import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";

export default async function validacionRol(id) {
    try {
        const [rows] = await bd.query("SELECT rol FROM usuario WHERE id = ?", [id]);
        return rows;
    } catch (error) {
        console.error("Error al validar usuario:", error);
        return [];
    }
}   