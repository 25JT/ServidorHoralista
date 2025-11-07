import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

async function createTransporter() {
  // Transporter usando App Password de Gmail
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.correoUser,   // tu correo Gmail
      pass: process.env.correoPass, // tu App Password de 16 caracteres
    },
  });

  // Mantengo tu misma función sendMail
  async function sendMail({ to, subject, text, html }) {
    const mailOptions = {
      from: process.env.correoUser,
      to,
      subject,
      text,
      html,
    };

    // Enviamos el correo
    const res = await transporter.sendMail(mailOptions);
    return res;
  }

  return { sendMail };
}

export default createTransporter;
