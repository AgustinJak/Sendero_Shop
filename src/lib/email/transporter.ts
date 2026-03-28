import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Remitentes por propósito
export const FROM_VENTAS = '"Sendero Shop" <ventas@sendero3d.com>';
export const FROM_AYUDA = '"Sendero Shop — Ayuda" <ayuda@sendero3d.com>';
export const FROM_EMAIL = FROM_VENTAS; // default
