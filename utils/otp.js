// utils/otp.js
export const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

import nodemailer from "nodemailer";

export const sendOtpEmail = async (to, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `Agrinosol <${process.env.EMAIL_USER}>`,
    to,
    subject: "Your Agrinosol Verification Code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="background-color: #4a8f29; padding: 20px; text-align: center; border-radius: 6px 6px 0 0;">
          <h1 style="color: white; margin: 0;">Agrinosol</h1>
        </div>
        
        <div style="padding: 30px;">
          <h2 style="color: #2d3748; margin-top: 0;">OTP Verification</h2>
          <p style="color: #4a5568;">Your one-time verification code for Agrinosol is:</p>
          
          <div style="background-color: #f0f7eb; border: 1px dashed #4a8f29; 
              border-radius: 6px; padding: 15px; text-align: center; 
              margin: 20px 0; font-size: 24px; font-weight: bold; 
              color: #2a5a18; letter-spacing: 3px;">
            ${otp}
          </div>
          
          <p style="color: #4a5568; font-size: 14px;">
            This code will expire in 10 minutes. Please do not share this code with anyone.
          </p>
          
          <p style="color: #4a5568; margin-top: 30px; font-size: 14px;">
            If you didn't request this code, you can safely ignore this email.
          </p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 15px; text-align: center; 
            border-radius: 0 0 6px 6px; font-size: 12px; color: #718096;">
          © ${new Date().getFullYear()} Agrinosol. All rights reserved.
        </div>
      </div>
    `,
  };
  
  await transporter.sendMail(mailOptions);
};