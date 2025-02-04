/* eslint-disable import/prefer-default-export */
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import { emailTemplate } from "./emailTemplate.js";
import { otpTemplate } from "./otpTemplete.js";

/**
 * @desc    Send an email for either OTP verification or account verification
 * @param   {string} email - User email to send the message
 * @param   {string} type - Type of email ('otp' or 'verification')
 * @param   {string} [code] - OTP code if type is 'otp'
 */
export const sendEmail = async (email, type, code = "") => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    let subject;
    let htmlContent;

    if (type === "verification") {
      const token = jwt.sign({ email }, process.env.JWT_SECRET_KEY, {
        expiresIn: process.env.JWT_EXPIRE_TIME,
      });
      subject = "Email Verification";
      htmlContent = emailTemplate(token);
    } else if (type === "otp") {
      subject = "Your OTP Code";
      htmlContent = otpTemplate(code);
    } else {
      throw new Error("Invalid email type. Must be 'otp' or 'verification'.");
    }

    const info = await transporter.sendMail({
      from: `"PFlow 👻" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html: htmlContent,
    });

    console.log("Email sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending email: ", error);
  }
};
