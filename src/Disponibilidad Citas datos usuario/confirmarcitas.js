import { app } from "../config/Seccion.js";
import bd from "../config/Bd.js";



//confirmacion de cita usuario
app.post("/confirmar-cita", async (req, res) => {
    const { id } = req.body;
    //console.log(req.body);
    const validacion = await bd.query(
        `select confirmada_por_cliente, estado from horalista.agenda where id = ?;`,
        [id]
    );

    if (validacion[0][0].confirmada_por_cliente === 1) {
        return res.status(400).json({ success: false, message: "El usuario ya confirmo la cita esta en un estado de " + validacion[0][0].estado });

    }

    try {
        const [result] = await bd.query(
            `UPDATE agenda 
SET confirmada_por_cliente = 1, 
    confirmada_at = NOW(), 
    estado = 'confirmada'
WHERE id = ?;
`,
            [id]
        );


        if (result.affectedRows > 0) {
            res.json({ success: true, message: "Cita confirmada" });
        } else {
            res.status(404).json({ success: false, message: "Cita no encontrada" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error en el servidor" });
    }


});