import nodemailer from "nodemailer";

// Using the credentials provided by the user
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "akshatpib@gmail.com",
    pass: process.env.EMAIL_PASS || "uhcb ldzo esfn xowg"
  }
});

export async function sendOtpEmail(toEmail: string, otp: string) {
  const mailOptions = {
    from: `"FlashDrop Security" <${process.env.EMAIL_USER || "akshatpib@gmail.com"}>`,
    to: toEmail,
    subject: "Your FlashDrop Verification Code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; border: 1px solid #eaeaea; border-radius: 10px;">
        <h2 style="color: #333;">Welcome to FlashDrop!</h2>
        <p style="color: #555; font-size: 16px;">Please use the following 6-digit code to verify your email address:</p>
        <div style="background-color: #f4f4f4; padding: 20px; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #000; border-radius: 8px; margin: 20px 0;">
          ${otp}
        </div>
        <p style="color: #888; font-size: 14px;">This code will expire in 5 minutes. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[MAILER] OTP email sent successfully to ${toEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[MAILER] Error sending OTP email to ${toEmail}:`, error);
    return false;
  }
}

export async function sendOrderConfirmation(toEmail: string, orderDetails: { orderId: string, eventName: string, seats: string[] }) {
  const mailOptions = {
    from: `"FlashDrop Tickets" <${process.env.EMAIL_USER || "akshatpib@gmail.com"}>`,
    to: toEmail,
    subject: `Your Tickets for ${orderDetails.eventName} are Confirmed! 🎉`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
        <h2 style="color: #333; text-align: center;">Ticket Confirmation</h2>
        <p style="color: #555; font-size: 16px;">Thank you for your purchase! Your tickets have been successfully confirmed.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr style="background-color: #f4f4f4;">
            <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Order ID</th>
            <td style="padding: 12px; font-family: monospace; border-bottom: 1px solid #ddd;">${orderDetails.orderId}</td>
          </tr>
          <tr>
            <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Event</th>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">${orderDetails.eventName}</td>
          </tr>
          <tr style="background-color: #f4f4f4;">
            <th style="padding: 12px; text-align: left;">Seats</th>
            <td style="padding: 12px;">${orderDetails.seats.join(", ")}</td>
          </tr>
        </table>
        
        <div style="margin-top: 30px; text-align: center;">
          <p style="color: #888; font-size: 14px;">Present this email or the QR code in your dashboard at the venue.</p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[MAILER] Order confirmation email sent successfully to ${toEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[MAILER] Error sending Order confirmation email to ${toEmail}:`, error);
    return false;
  }
}
