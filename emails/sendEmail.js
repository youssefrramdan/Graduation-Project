import jwt from "jsonwebtoken"
import nodemailer from "nodemailer"
import { emailTemplate } from "./emailTemplate.js";

export const sendEmail = async(email)=>{

    const transporter = nodemailer.createTransport({
        service:"gmail",
        auth: {
            user:"aya.h.abdelsamed@gmail.com",
            pass:"csfthrzboiztlpzp",
        },
    });

    let token = jwt.sign({email},process.env.JWT_SECRET_KEY)

    const info = await transporter.sendMail({
        from: '"PFlow 👻" <aya.h.abdelsamed@gmail.com>', // sender address
        to: email, // list of receivers
        subject: "Hello ✔", // Subject line
        html: emailTemplate(token), // html body
    });

    console.log("Message sent: %s", info.messageId);


}