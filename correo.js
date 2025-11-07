import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

async function createTransporter() {
  // Transporter usando App Password de Gmail
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.correoUser,
      pass: process.env.correoPass,
    },
    tls: {
      minVersion: "TLSv1",
      rejectUnauthorized: false,
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
