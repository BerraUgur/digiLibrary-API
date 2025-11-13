require('dotenv').config();
const sgMail = require('@sendgrid/mail');
const { logEvents } = require('../middleware/logEvents');

// SendGrid API Key configuration
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Send reminder email for book return
const sendReminderEmail = async (to, subject, text) => {
  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject,
    text,
  };

  try {
    await sgMail.send(msg);
  } catch (error) {
    await logEvents(
      `[OPERATION] Send Reminder Email Failed\n[ERROR] ${error.message}\n[RECIPIENT] ${to}\n[SUBJECT] ${subject}\n[STACK]\n${error.stack}`,
      'errLog.log'
    );
    throw error;
  }
};

// Send HTML email (general purpose)
const sendEmail = async (to, subject, html) => {
  const msg = {
    to,
    from: {
      name: 'DigiLibrary',
      email: process.env.SENDGRID_FROM_EMAIL
    },
    subject,
    html,
  };

  try {
    const response = await sgMail.send(msg);
    return { success: true, messageId: response[0].headers['x-message-id'] };
  } catch (error) {
    await logEvents(
      `[OPERATION] Send Email Failed\n[ERROR] ${error.message}\n[RECIPIENT] ${to}\n[SUBJECT] ${subject}\n[STACK]\n${error.stack}`,
      'errLog.log'
    );
    throw error;
  }
};

// Send password reset email with token
const sendPasswordResetEmail = async (to, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  const subject = 'Password Reset Request - DigiLibrary';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #667eea;">Password Reset Request</h2>
      <p>Hello,</p>
      <p>You have requested to reset your password. Click the button below to reset it:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" 
           style="background-color: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Reset Password
        </a>
      </div>
      
      <p>Or copy and paste this link into your browser:</p>
      <p style="color: #666; word-break: break-all;">${resetUrl}</p>
      
      <p style="color: #e74c3c; font-weight: bold;">⚠️ This link is valid for 1 hour and can only be used once.</p>
      
      <p>If you didn't request this, you can safely ignore this email.</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="color: #999; font-size: 12px;">DigiLibrary - ${new Date().getFullYear()}</p>
    </div>
  `;

  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject,
    html,
  };

  try {
    await sgMail.send(msg);
  } catch (error) {
    await logEvents(
      `[OPERATION] Send Password Reset Email Failed\n[ERROR] ${error.message}\n[RECIPIENT] ${to}\n[RESET URL] ${resetUrl}\n[STACK]\n${error.stack}`,
      'errLog.log'
    );
    throw error;
  }
};

// Send late fee payment confirmation email
const sendLateFeePaymentConfirmation = async (userEmail, loan, paymentAmount) => {
  const subject = 'Payment Confirmation - Late Return Fee';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10b981;">✓ Payment Successful</h2>
      <p>Hello,</p>
      <p>Your late return fee has been successfully paid.</p>
      
      <div style="background: #f0fdf4; padding: 20px; border-radius: 10px; margin: 20px 0;">
        <h3 style="color: #059669; margin-top: 0;">Payment Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666;">Book:</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right;">${loan.book?.title || 'Unknown'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Amount Paid:</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #059669;">${paymentAmount} TL</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Payment Date:</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right;">${new Date().toLocaleDateString('en-US')}</td>
          </tr>
        </table>
      </div>
      
      <p style="color: #059669; font-weight: bold;">🎉 Your late fee has been completely cleared!</p>
      <p>Remember to return your books on time.</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="color: #999; font-size: 12px;">DigiLibrary - ${new Date().getFullYear()}</p>
    </div>
  `;

  const msg = {
    to: userEmail,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject,
    html,
  };

  try {
    await sgMail.send(msg);
  } catch (error) {
    await logEvents(
      `[OPERATION] Send Payment Confirmation Failed\n[ERROR] ${error.message}\n[RECIPIENT] ${userEmail}\n[BOOK] ${loan?.book?.title || 'Unknown'}\n[AMOUNT] ${paymentAmount} TL\n[STACK]\n${error.stack}`,
      'errLog.log'
    );
  }
};

module.exports = {
  sendReminderEmail,
  sendPasswordResetEmail,
  sendLateFeePaymentConfirmation,
  sendEmail
};
