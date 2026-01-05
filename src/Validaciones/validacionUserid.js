import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";

export default async function validacionUserid(userid) {
    try {
        const [rows] = await bd.query("SELECT id FROM usuario WHERE id = ?", [userid]);
        return rows;
    } catch (error) {
        console.error("Error al validar usuario:", error);
        return [];
    }
}   