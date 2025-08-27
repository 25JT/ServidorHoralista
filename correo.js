import nodemailer from "nodemailer"; 
import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

const oAuth2Client = new google.auth.OAuth2(
  process.env.client_id,
  process.env.client_secret,
  process.env.redirect_uri // 👈 obligatorio
);

oAuth2Client.setCredentials({
  refresh_token: process.env.refresh_token,
});

async function createTransporter() {
  const accessToken = await oAuth2Client.getAccessToken();

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.correoUser,
      clientId: process.env.client_id,
      clientSecret: process.env.client_secret,
      refreshToken: process.env.refresh_token,
      accessToken: accessToken.token, // 👈 importante .token
    },
  });

  return transporter;
}

export default createTransporter;
