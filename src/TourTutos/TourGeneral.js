import { bd } from "../config/Bd.js";
import { verificarSesion } from "../middleware/autenticacion.js";
import { app } from "../config/Seccion.js";

app.get("/api/tour/general", verificarSesion, async (req, res) => {
    try {
        const userid = req.session.userId;

        // 1. Obtener el id_pservicio del usuario
        const [pservicios] = await bd.query("select id from pservicio where id_usuario = ?", [userid]);

        if (pservicios.length === 0) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        const id_pservicio = pservicios[0].id;

        // 2. Buscar si ya existe un registro en tuto_tours para este pservicio
        const [tours] = await bd.query("select tour_general from tuto_tours where id_pservicio = ?", [id_pservicio]);

        // 3. Si no existe el registro, crearlo
        if (tours.length === 0) {
            const id_tour = crypto.randomUUID();
            //  console.log("Creando registro inicial en tuto_tours para pservicio:", id_pservicio);

            // IMPORTANTE: Usar await para evitar race conditions y errores de duplicados si recargan rápido
            await bd.query(
                "insert into tuto_tours (id, id_pservicio, tour_ajustes, tour_general) values (?, ?, ?, ?)",
                [id_tour, id_pservicio, 0, 0]
            );

            return res.status(200).json(0); // El tour no se ha realizado
        }

        // 4. Si existe, devolver el estado actual
        const tour_general = tours[0].tour_general;

        if (tour_general === 1) {
            return res.status(200).json(1); // Tour ya realizado
        } else {
            return res.status(200).json(0); // Tour no realizado
        }

    } catch (error) {
        console.error("Error en /api/tour/general:", error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
});

app.put("/api/tour/general/finalizado", verificarSesion, async (req, res) => {
    try {
        const userid = req.session.userId;

        const [pservicios] = await bd.query("select id from pservicio where id_usuario = ?", [userid]);

        if (pservicios.length === 0) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        const id_pservicio = pservicios[0].id;

        await bd.query("update tuto_tours set tour_general = 1 where id_pservicio = ?", [id_pservicio]);

        return res.status(200).json({ message: "Tour realizado" });
    } catch (error) {
        console.error("Error en /api/tour/general/finalizado:", error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
});

