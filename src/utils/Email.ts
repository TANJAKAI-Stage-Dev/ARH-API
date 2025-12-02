import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// export const sendConfirmationEmail = async (email: string, firstName: string, code: string) => {
//   try {
//     const transporter = nodemailer.createTransport({
//       host: "smtp.gmail.com", 
//       port: 465, 
//       secure: true, 
//       auth: {
//         user: process.env.SMTP_USER, 
//         pass: process.env.SMTP_PASS, 
//       },
//     });

//     await transporter.sendMail({
//       from: `"Support" <${process.env.SMTP_USER}>`,
//       to: email,
//       subject: "Votre code de validation",
//       html: `
//         <p>Bonjour ${firstName},</p>
//         <p>Voici votre code de validation pour activer votre compte :</p>
//         <h2>${code}</h2>
//         <p>Ce code est valide pendant 24 heures.</p>
//         <a href="${process.env.FRONTEND_URL}/verify?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}" target="_blank">
//         Vérifier mon compte
//     </a>
//       `,
//     });

//     console.log("Email envoyé à", email);
//   } catch (err) {
//     console.error("Erreur lors de l'envoi de l'email :", err);
//     throw err;
//   }
// };

export const sendSetupPwd = async (email: string, firstName: string, token: string) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const setupLink = `${process.env.FRONTEND_URL}/setup-password/${token}`;

  const mailOptions = {
    from: `"Support" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Configurer votre mot de passe",
    html: `
      <p>Bonjour ${firstName},</p>
      <p>Votre compte a été créé par l'administrateur. Cliquez sur le lien ci-dessous pour définir votre mot de passe :</p>
      <a href="${setupLink}" style="display:inline-block;padding:10px 15px;background-color:#4CAF50;color:#fff;text-decoration:none;border-radius:5px;">
        Configurer mon mot de passe
      </a>
      <p>Ce lien expirera dans 24 heures.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};
