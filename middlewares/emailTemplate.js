/* eslint-disable arrow-body-style */
/* eslint-disable import/prefer-default-export */

export const emailTemplate = (token) => {
  const isProduction = process.env.NODE_ENV === "production";

  const logoUrl = isProduction
    ? `https://pflow.onrender.com/api/v1/auth/verify/${token}`
    : `http://localhost:8000/api/v1/auth/verify/${token}`;

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification</title>
      <style>
          body {
              font-family: Arial, sans-serif;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
          }
          .container {
              width: 100%;
              max-width: 600px;
              margin: 50px auto;
              background: #ffffff;
              padding: 20px;
              border-radius: 10px;
              box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
              text-align: center;
          }
          .logo {
              width: 120px;
              margin-bottom: 20px;
          }
          .header {
              font-size: 24px;
              font-weight: bold;
              color: #333;
          }
          .message {
              font-size: 16px;
              color: #666;
              margin: 20px 0;
          }
          .verify-button {
              display: inline-block;
              padding: 12px 20px;
              font-size: 18px;
              color: #ffffff;
              background-color: #007bff;
              text-decoration: none;
              border-radius: 5px;
              margin-top: 20px;
          }
          .footer {
              margin-top: 30px;
              font-size: 14px;
              color: #999;
          }
          .footer a {
              color: #007bff;
              text-decoration: none;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <img src="${logoUrl}" alt="Company Logo" class="logo">
          <div class="header">Verify Your Email Address</div>
          <div class="message">
              Thank you for signing up! Please confirm your email address by clicking the button below.
          </div>
          <a href="https://pflow.onrender.com/api/v1/auth/verify/${token}" class="verify-button">Verify Email</a>
          <div class="footer">
              <p>If you did not create an account, please ignore this email or <a href="#">contact support</a>.</p>
              <p>Best regards,<br>The [Your Company] Team</p>
          </div>
      </div>
  </body>
  </html>
  `;
};
