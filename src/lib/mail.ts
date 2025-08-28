// src/lib/mail.ts
import nodemailer from "nodemailer";

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail(opts: MailOptions) {
  let transporter;

  if (process.env.NODE_ENV === "development") {
    // Ethereal: free SMTP test account
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  } else {
    // Real SMTP (from .env.local)
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });

  if (process.env.NODE_ENV === "development") {
    console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
  }

  return info;
}
