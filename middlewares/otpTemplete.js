export const otpTemplate = (otpCode) => {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>OTP Verification</title>
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
          .otp-code {
              font-size: 22px;
              font-weight: bold;
              color: #007bff;
              background: #f1f1f1;
              padding: 10px 20px;
              display: inline-block;
              border-radius: 5px;
              letter-spacing: 4px;
              margin-top: 15px;
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
          <img src="https://yourcompany.com/logo.png" alt="Company Logo" class="logo">
          <div class="header">One-Time Password (OTP)</div>
          <div class="message">
              Use the OTP below to verify your identity. This code is valid for the next 10 minutes.
          </div>
          <div class="otp-code">${otpCode}</div>
          <div class="footer">
              <p>If you did not request this OTP, please <a href="#">contact support</a> immediately.</p>
              <p>Best regards,<br>The [Your Company] Team</p>
          </div>
      </div>
  </body>
  </html>
  `;
};
