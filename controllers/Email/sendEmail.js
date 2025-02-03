

// eslint-disable-next-line import/no-extraneous-dependencies
import nodemailer from "nodemailer";

// eslint-disable-next-line import/prefer-default-export
export const sendEmail = async(email ,subject, message)=>{
    const transporter = nodemailer.createTransport({
        service:"gmail",
        auth: {
            user: "ayaalaaelhenawy@gmail.com",
            pass: "lagcwnjyjgybydbc",
        },
    });
    
    const info = await transporter.sendMail({
        from: '"PFlow 👻" <ayaalaaelhenawy@gmail.com>', // sender address
        to: email, // list of receivers
        subject: subject, 
        text: message,  // Subject line
       

    });
    console.log("Message sent: %s", info.messageId);
}