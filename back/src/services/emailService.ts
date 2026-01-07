import config from '../config/config.js';

export interface EmailOptions {
    to: string;
    subject: string;
    text: string;
    html: string;
}

// Console email service (development)
function sendConsoleEmail(options: EmailOptions): Promise<void> {
    console.log('\n==========================================================');
    console.log('📧 EMAIL SENT (CONSOLE MODE)');
    console.log('==========================================================');
    console.log(`From: ${config.email.fromName} <${config.email.from}>`);
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log('----------------------------------------------------------');
    console.log('TEXT VERSION:');
    console.log(options.text);
    console.log('----------------------------------------------------------');
    console.log('HTML VERSION:');
    console.log(options.html);
    console.log('==========================================================\n');
    return Promise.resolve();
}

// Main send email function
export async function sendEmail(options: EmailOptions): Promise<void> {
    if (config.email.service === 'console') {
        return sendConsoleEmail(options);
    }

    // Future: Add nodemailer/SendGrid integration here
    throw new Error(`Email service '${config.email.service}' not implemented`);
}

// Send verification email
export async function sendVerificationEmail(email: string, verificationToken: string): Promise<void> {
    const verificationUrl = `${config.frontendUrl}/auth/verify-email/${verificationToken}`;

    const subject = 'Verify Your Email - Capitance';
    const text = `
Welcome to Capitance!

Please verify your email address by clicking the link below:
${verificationUrl}

This link will expire in 24 hours.

If you did not create this account, please ignore this email.

Best regards,
The Capitance Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to Capitance!</h1>
        <p>Thank you for creating an account. Please verify your email address to get started.</p>
        <a href="${verificationUrl}" class="button">Verify Email Address</a>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #007bff;">${verificationUrl}</p>
        <p><strong>This link will expire in 24 hours.</strong></p>
        <div class="footer">
            <p>If you did not create this account, please ignore this email.</p>
            <p>&copy; ${new Date().getFullYear()} Capitance. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `.trim();

    await sendEmail({ to: email, subject, text, html });
}

// Send password reset email
export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${config.frontendUrl}/auth/reset-password/${resetToken}`;

    const subject = 'Reset Your Password - Capitance';
    const text = `
Password Reset Request

We received a request to reset your password for your Capitance account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you did not request a password reset, please ignore this email and your password will remain unchanged.

Best regards,
The Capitance Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Password Reset Request</h1>
        <p>We received a request to reset your password for your Capitance account.</p>
        <a href="${resetUrl}" class="button">Reset Password</a>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #dc3545;">${resetUrl}</p>
        <p><strong>This link will expire in 1 hour.</strong></p>
        <div class="warning">
            <p><strong>Security Notice:</strong> If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Capitance. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `.trim();

    await sendEmail({ to: email, subject, text, html });
}
