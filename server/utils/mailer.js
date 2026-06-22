const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS,
  },
});

async function sendDevisEmail({ to, subject, text, pdfBuffer, pdfFilename }) {
  await transporter.sendMail({
    from: process.env.MAIL_FROM || "Media4Devis <no-reply@media4.fr>",
    to,
    subject,
    text,
    attachments: [
      {
        filename: pdfFilename || "devis.pdf",
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

module.exports = { sendDevisEmail };