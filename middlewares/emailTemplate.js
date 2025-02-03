/* eslint-disable arrow-body-style */
/* eslint-disable import/prefer-default-export */


export const emailTemplate=(token)=>{
    return `
    <!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>OTP Email Template</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">

  <link rel="stylesheet" href="/style.css">
</head>

<body>
  <div class="container-sec">
    <div class="text-center">
      <div><i class="fas fa-lock otp-lock"></i></div>
      <div class="welcome-section">
        <div class="app-name">
          --- APP NAME ---
        </div>
        <div class="welcome-text">
          Thanks for signing up !
        </div>

        <div class="verify-text">
          Please Verify Your Email Address
        </div>
        <div class="email-icon">
          <i class="fas fa-envelope-open"></i>
        </div>

      </div>
      <h2>Hello, [User's Name]</h2>
      <p>Your One-Time Password (OTP) for verification is:</p>
      <div class="otp-code">123456</div>
      <p class="mt-4">Please use this OTP to complete your verification. The OTP is valid for the next 10 minutes.</p>
      <a href="http://localhost:8000/api/v1/auth/verify/${token}" class="btn-verify">Verify Now</a>
    </div>
    <div class="footer-text">
      <p>If you did not request this OTP, please <a href="#">contact us</a> immediately.</p>
      <p>Thank you,<br>The [Your Company] Team</p>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>
</body>

</html>
    
    `
}