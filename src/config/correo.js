import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

const oAuth2Client = new google.auth.OAuth2(
  process.env.client_id,
  process.env.client_secret,
  process.env.redirect_uri
);

oAuth2Client.setCredentials({
  refresh_token: process.env.refresh_token,
});

async function createTransporter() {
  const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

  // Esta función reemplaza al "sendMail" de nodemailer
  async function sendMail({ to, subject, text, html }) {
    const encodedMessage = Buffer.from(
      [
        `From: ${process.env.correoUser}`,
        `To: ${to}`,
        `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`, // asunto codificado en UTF-8 base64
        "MIME-Version: 1.0",
        "Content-Type: text/html; charset=UTF-8", // aquí forzamos utf-8
        "",
        
        html || text,
      ].join("\n")
    )
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    });

    return res.data;
  }

  return { sendMail };
}

export default createTransporter;
