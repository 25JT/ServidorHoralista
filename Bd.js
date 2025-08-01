import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

export const bd = await mysql.createConnection({
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database,
    
});

bd.connect((err) => {
    if (err) {
        console.error("Error connecting to MySQL:", err);
        return;
    }
    console.log("Connected to MySQL database");
});

export default bd;
