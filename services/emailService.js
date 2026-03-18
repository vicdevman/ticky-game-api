import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const emailService = {
  async sendWelcomeEmail(email, username) {
    const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { background-color: #08080e;  color: rgba(255, 255, 255, 0.96); font-family: 'Inter', sans-serif; margin: 0; padding: 40px; }
    .container { max-width: 600px; margin: 0 auto; background: #111119; border: 1px solid rgba(255,255,255,0.07); border-radius: 32px; padding: 40px; }
    .logo { color: #7c3aed; font-size: 24px; font-weight: 800; letter-spacing: -1px; margin-bottom: 30px; }
    h1 { font-size: 32px; font-weight: 800; tracking: -0.02em; margin-bottom: 20px; color: #ffffff }
    p { color: rgba(255,255,255,0.6); font-size: 16px; line-height: 1.6; }
    .cta { display: inline-block; background: #7c3aed; color: #ffffff; padding: 16px 32px; border-radius: 16px; font-weight: bold; text-decoration: none; margin-top: 30px; box-shadow: 0 10px 20px rgba(124,58,237,0.3); }
    .footer { margin-top: 40px; font-size: 12px; color: rgba(255,255,255,0.3); }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Ticky</div>
    <h1>The Arena Awaits.</h1>
    <p>Hey ${username}, you've just stepped into the most competitive Tic-Tac-Toe arena on the planet. Your journey to Grandmaster starts now.</p>
    <p>Claim your first win and start climbing the global leaderboard today.</p>
    <a href="https://ticky-game.vercel.app/home" class="cta">PLAY YOUR FIRST MATCH</a>
    <div class="footer">Ticky Gaming Sector © 2026. All rights reserved.</div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: `"Ticky Arena" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Welcome to the Arena, ${username}! ⚡️`,
      html,
    });
  },

  async sendRetentionReminder(email, username) {
    const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { background-color: #08080e; color: rgba(255, 255, 255, 0.96); font-family: 'Inter', sans-serif; margin: 0; padding: 40px; }
    .container { max-width: 600px; margin: 0 auto; background: #111119; border: 1px solid rgba(255,255,255,0.07); border-radius: 32px; padding: 40px; text-align: center; }
    .badge { background: rgba(124,58,237,0.1); color: #7c3aed; padding: 8px 16px; border-radius: 100px; font-size: 12px; font-weight: 800; letter-spacing: 2px; margin-bottom: 20px; display: inline-block; }
    h1 { font-size: 36px; font-weight: 800; margin-bottom: 15px; color: #ffffff}
    p { color: rgba(255,255,255,0.6); font-size: 16px; margin-bottom: 30px; }
    .cta { display: block; background: #7c3aed; color: #ffffff; padding: 18px; border-radius: 16px; font-weight: bold; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">TACTICAL ALERT</div>
    <h1>The sector is quiet. Too quiet.</h1>
    <p>It's been a while since your last match, ${username}. Your rank is slipping and new challengers are taking your spot on the top 3.</p>
    <p>A 20 XP bonus is waiting for your return. Come back and defend your title.</p>
    <a href="https://ticky-game.vercel.app/home" class="cta">RETURN TO THE ARENA</a>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: `"Ticky Arena" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Your streak is in danger... ⚔️`,
      html,
    });
  },

  async sendOtpEmail(email, otp) {
    const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { background-color: #08080e; color: rgba(255, 255, 255, 0.96); font-family: 'Inter', sans-serif; margin: 0; padding: 40px; }
    .container { max-width: 600px; margin: 0 auto; background: #111119; border: 1px solid rgba(255,255,255,0.07); border-radius: 32px; padding: 40px; }
    h1 { font-size: 24px; font-weight: 800; margin-bottom: 10px; color: #ffffff}
    p { color: rgba(255,255,255,0.6); font-size: 14px; margin-bottom: 30px; }
    .otp-box { background: rgba(255,255,255,0.03); border: 2px dashed rgba(124,58,237,0.4); border-radius: 20px; padding: 30px; text-align: center; margin-bottom: 30px; }
    .otp-code { font-family: 'Space Mono', monospace; font-size: 48px; font-weight: 800; color: #7c3aed; letter-spacing: 12px; }
    .warning { color: rgba(255,255,255,0.4); font-size: 11px; font-style: italic; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Identity Verification</h1>
    <p>Use the code below to securely reset your password. This code expires in 15 minutes.</p>
    <div class="otp-box">
      <div class="otp-code">${otp}</div>
    </div>
    <div class="warning">If you didn't request this, you can safely ignore this email. Your account remains secure.</div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: `"Ticky Arena" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Your Verification Code: ${otp} 🛡️`,
      html,
    });
  },
};
