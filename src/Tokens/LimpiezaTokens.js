import cron from "node-cron";
import bd from "../config/Bd.js";


// 📌 Limpieza de tokens → todos los días a las 2 AM
cron.schedule("0 2 * * *", () => {
    console.log("🧹 Ejecutando limpieza de tokens...");
    limpiarTokens();
});



// =========================
// 📌 2. Limpieza de tokens expirados
// =========================
async function limpiarTokens() {
    try {
        const [result] = await bd.execute(
            "DELETE FROM token WHERE expiracion < NOW()"
        );
        if (result.affectedRows > 0) {
            console.log(`🧹 Tokens eliminados: ${result.affectedRows}`);
        }
    } catch (err) {
        console.error("❌ Error eliminando tokens:", err);
    }
}