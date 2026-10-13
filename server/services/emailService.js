const nodemailer = require('nodemailer');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables (.env files)
dotenv.config();
const rootDir = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(rootDir, '.env') });
if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: path.join(rootDir, '.env.production') });
}
dotenv.config({ path: path.join(__dirname, '..', '.env') });

/**
 * Get Gmail SMTP configuration strictly from environment variables.
 * Gmail SMTP is the ONLY provider for OTP emails.
 * Never falls back to Brevo or unauthenticated relays.
 */
function getSmtpConfig() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = port === 465; // Port 587 uses STARTTLS (secure: false)
  const user = (process.env.EMAIL_USER || process.env.GMAIL_USER || '').trim();
  const pass = (process.env.EMAIL_PASS || process.env.GMAIL_APP_PASS || '')
    .replace(/['"]/g, '')
    .replace(/\s+/g, '');

  return {
    host,
    port,
    secure,
    user,
    pass,
    isConfigured: Boolean(user && pass)
  };
}

/**
 * Build production-compatible Gmail SMTP Nodemailer transporter.
 * Uses port 587 with STARTTLS (or 465 if explicitly configured).
 */
function createTransporter() {
  const config = getSmtpConfig();

  if (!config.isConfigured) {
    console.warn('⚠️ [Gmail SMTP] EMAIL_USER or EMAIL_PASS environment variables are not set. OTP emails will fail until configured.');
  }

  const transporterOptions = {
    host: config.host,
    port: config.port,
    secure: config.secure, // false for port 587
    requireTLS: !config.secure, // Enforce STARTTLS when secure is false (port 587)
    auth: {
      user: config.user,
      pass: config.pass
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 10000, // 10s connection timeout prevents long hangs on cloud firewalls
    greetingTimeout: 10000,
    socketTimeout: 15000
  };

  const transport = nodemailer.createTransport(transporterOptions);
  console.log(`✉️ [Email Gateway] Configured via Google Gmail SMTP (${config.host}:${config.port}${!config.secure ? ' STARTTLS' : ' SSL'}) - Account: ${config.user || '(Not configured)'}`);
  return transport;
}

let activeTransporter = null;

function getTransporter() {
  if (!activeTransporter) {
    activeTransporter = createTransporter();
  }
  return activeTransporter;
}

const SMTP_CONFIG = {
  get host() {
    return getSmtpConfig().host;
  },
  get port() {
    return getSmtpConfig().port;
  },
  get secure() {
    return getSmtpConfig().secure;
  },
  get auth() {
    const config = getSmtpConfig();
    return {
      user: config.user,
      pass: config.pass
    };
  }
};

const SENDER = {
  get name() {
    return process.env.EMAIL_SENDER_NAME || 'MessConnect Verification';
  },
  get email() {
    const config = getSmtpConfig();
    return process.env.EMAIL_FROM || config.user || 'support@messconnect.in';
  }
};

/**
 * Clean HTML to readable plain text (strips <style>, <script>, tags)
 * Prevents raw CSS code from contaminating the text/plain MIME part
 */
function stripHtmlToPlainText(html) {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/p>|<\/div>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Check connection health with Gmail SMTP
 */
async function checkSmtpHealth() {
  const config = getSmtpConfig();

  if (!config.isConfigured) {
    return {
      connected: false,
      mode: 'GMAIL_SMTP',
      provider: 'Google Gmail SMTP',
      host: config.host,
      port: config.port,
      user: config.user || '(not configured)',
      error: 'Missing Gmail SMTP credentials. Please set EMAIL_USER and EMAIL_PASS environment variables.',
      isConfigured: false
    };
  }

  try {
    const t = getTransporter();
    await t.verify();
    return {
      connected: true,
      mode: 'GMAIL_SMTP',
      provider: 'Google Gmail SMTP',
      host: config.host,
      port: config.port,
      user: config.user,
      message: `Gmail SMTP connection verified successfully (${config.host}:${config.port}${!config.secure ? ' STARTTLS' : ' SSL'}).`,
      isConfigured: true
    };
  } catch (err) {
    const safeMsg = (err.message || 'SMTP connection verification failed').replace(
      new RegExp(config.pass || '___impossible___', 'gi'),
      '***'
    );

    console.error(`⚠️ [Gmail SMTP Health Check Failed] Code: ${err.code || 'N/A'} | Message: ${safeMsg}`);

    return {
      connected: false,
      mode: 'GMAIL_SMTP',
      provider: 'Google Gmail SMTP',
      host: config.host,
      port: config.port,
      user: config.user,
      error: safeMsg,
      code: err.code || null,
      responseCode: err.responseCode || null,
      isConfigured: true
    };
  }
}

/**
 * Standard high-deliverability email delivery wrapper.
 * Strictly uses Gmail SMTP. NEVER falls back to Brevo or unauthenticated relays.
 */
async function sendEmail({ to, subject, html, text }) {
  const config = getSmtpConfig();

  if (!config.isConfigured) {
    const errorMsg = 'Gmail SMTP is not configured. Missing EMAIL_USER or EMAIL_PASS environment variable.';
    console.error(`❌ [Gmail SMTP Error] ${errorMsg}`);
    return {
      success: false,
      error: errorMsg,
      code: 'EMISSINGCREDENTIALS',
      mode: 'GMAIL_SMTP'
    };
  }

  const plainText = text || stripHtmlToPlainText(html);
  const senderEmail = SENDER.email;

  const mailOptions = {
    from: `"${SENDER.name}" <${senderEmail}>`,
    to,
    replyTo: senderEmail,
    subject,
    text: plainText,
    html,
    headers: {
      'Auto-Submitted': 'auto-generated',
      'X-Auto-Response-Suppress': 'All',
      'X-Entity-Ref-ID': `mc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      'X-Mailer': 'MessConnect Transactional Engine'
    }
  };

  try {
    const t = getTransporter();
    const info = await t.sendMail(mailOptions);
    console.log(`✉️ [Gmail SMTP Delivered] Sent to: ${to} | Subject: "${subject}" | MessageId: ${info.messageId}`);
    return {
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      mode: 'GMAIL_SMTP'
    };
  } catch (err) {
    // Sanitize any sensitive secrets from error message
    const safeMsg = (err.message || 'SMTP delivery failure').replace(
      new RegExp(config.pass || '___impossible___', 'gi'),
      '***'
    );

    console.error(`❌ [Gmail SMTP Delivery Error] Failed to send email to ${to}:`);
    console.error(`   Error Code: ${err.code || 'N/A'} | Response Code: ${err.responseCode || 'N/A'}`);
    console.error(`   Message: ${safeMsg}`);

    // Contextual diagnostics without leaking credentials or secrets
    if (err.code === 'EAUTH' || err.responseCode === 535) {
      console.error(`👉 [SMTP Troubleshooting Hint] Gmail authentication failed (535 EAUTH).`);
      console.error(`   1. Verify EMAIL_USER is your full Gmail address.`);
      console.error(`   2. Verify EMAIL_PASS is a 16-character Google App Password (not your personal Google account password).`);
      console.error(`   3. Verify 2-Step Verification is turned ON in Google Account settings.`);
    } else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNECTION' || err.code === 'ESOCKET') {
      console.error(`👉 [SMTP Troubleshooting Hint] Connection to ${config.host}:${config.port} timed out (${err.code}).`);
      console.error(`   Cloud hosting provider firewall may be blocking outbound port ${config.port}.`);
    } else if (err.code === 'ENOTFOUND') {
      console.error(`👉 [SMTP Troubleshooting Hint] DNS lookup failed for ${config.host}. Check server network configuration.`);
    }

    return {
      success: false,
      error: safeMsg,
      code: err.code || null,
      responseCode: err.responseCode || null,
      mode: 'GMAIL_SMTP'
    };
  }
}

/**
 * 1. Send 6-Digit Password Reset OTP Email
 */
async function sendPasswordResetOtp({ email, name, otp }) {
  const userName = name || 'MessConnect User';
  const subject = `Your MessConnect password reset code: ${otp}`;

  const text = `Hello ${userName},

We received a request to reset the password for your MessConnect account (${email}).

Your 6-digit verification code is:

  ${otp}

This code is valid for 3 minutes.

Security Notice:
Never share this code with anyone. MessConnect team members will never ask for your verification code.

If you did not request a password reset, you can safely ignore this email. Your account remains secure.

--
MessConnect Security Team
Pune, Maharashtra, India`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Verification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.04);">
          <tr>
            <td style="background-color: #ea580c; padding: 28px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">MessConnect</h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #ffedd5;">Password Reset Verification</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 28px; color: #1e293b; line-height: 1.6;">
              <p style="margin: 0 0 14px; font-size: 14px; color: #334155;">Hello <strong>${userName}</strong>,</p>
              <p style="margin: 0 0 20px; font-size: 14px; color: #334155;">We received a request to reset your password. Use the verification code below to proceed:</p>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0;">
                <tr>
                  <td align="center" style="background-color: #fff7ed; border: 2px dashed #ea580c; border-radius: 12px; padding: 18px 24px;">
                    <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #c2410c;">${otp}</div>
                    <div style="margin-top: 8px; font-size: 12px; font-weight: 600; color: #9a3412;">Valid for 3 minutes</div>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 12px; font-size: 13px; color: #64748b;">Never share this code with anyone. MessConnect representatives will never ask for your code.</p>
              <p style="margin: 0; font-size: 13px; color: #94a3b8;">If you did not request this change, you can safely ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; line-height: 1.5;">
              <p style="margin: 0 0 4px; font-weight: 600; color: #475569;">MessConnect Security Notification</p>
              <p style="margin: 0 0 6px;">Pune, Maharashtra, India</p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">You received this email because a password reset was requested for your account.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendEmail({ to: email, subject, html, text });
}

/**
 * 2. Send 6-Digit Email Registration Verification OTP (Expires in 3 mins)
 */
async function sendVerificationOtp({ email, name, otp, role }) {
  const userName = name || 'Student / Partner';
  const roleLabel = role === 'OWNER' ? 'Mess Partner' : 'Student';
  const subject = `Your MessConnect verification code: ${otp}`;

  const text = `Hello ${userName},

Thank you for registering on MessConnect.

Your 6-digit ${roleLabel} verification code is:

  ${otp}

This code is valid for 3 minutes. Enter this code on your screen to complete your registration.

Security Notice:
Never share this code with anyone. MessConnect representatives will never ask for your code.

If you did not request this verification code, please disregard this email.

--
MessConnect Security Team
Pune, Maharashtra, India`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MessConnect Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.04);">
          <tr>
            <td style="background-color: #059669; padding: 28px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">MessConnect</h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #d1fae5;">${roleLabel} Account Verification</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 28px; color: #1e293b; line-height: 1.6;">
              <p style="margin: 0 0 14px; font-size: 14px; color: #334155;">Hello <strong>${userName}</strong>,</p>
              <p style="margin: 0 0 20px; font-size: 14px; color: #334155;">Enter the following 6-digit code to verify your email and activate your account:</p>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0;">
                <tr>
                  <td align="center" style="background-color: #ecfdf5; border: 2px dashed #059669; border-radius: 12px; padding: 18px 24px;">
                    <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #047857;">${otp}</div>
                    <div style="margin-top: 8px; font-size: 12px; font-weight: 600; color: #065f46;">Valid for 3 minutes</div>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 12px; font-size: 13px; color: #64748b;">This code expires in 3 minutes. Please do not share it with anyone.</p>
              <p style="margin: 0; font-size: 13px; color: #94a3b8;">If you did not request this verification code, please disregard this email.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; line-height: 1.5;">
              <p style="margin: 0 0 4px; font-weight: 600; color: #475569;">MessConnect Security Notification</p>
              <p style="margin: 0 0 6px;">Pune, Maharashtra, India</p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">You received this email because an account registration was initiated with this address.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendEmail({ to: email, subject, html, text });
}

/**
 * 2b. Send Mess Owner Instant Login OTP (Valid for 3 mins, anytime)
 */
async function sendOwnerLoginOtp({ email, name, messName, otp }) {
  const userName = name || 'Mess Partner';
  const kitchen = messName || 'Your Kitchen';
  const subject = `Your MessConnect partner login code: ${otp}`;

  const text = `Hello ${userName},

You requested a login code for ${kitchen} on the MessConnect Partner Portal.

Your 6-digit login code is:

  ${otp}

This code is valid for 3 minutes.

Never share this code with anyone.

If you did not request this login code, please contact MessConnect support immediately.

--
MessConnect Partner Support
Pune, Maharashtra, India`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Partner Portal Login</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.04);">
          <tr>
            <td style="background-color: #d97706; padding: 28px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">MessConnect</h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #fef3c7;">Partner Portal Login &bull; ${kitchen}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 28px; color: #1e293b; line-height: 1.6;">
              <p style="margin: 0 0 14px; font-size: 14px; color: #334155;">Hello <strong>${userName}</strong>,</p>
              <p style="margin: 0 0 20px; font-size: 14px; color: #334155;">Enter the following 6-digit code to sign in to your MessConnect Partner Portal:</p>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0;">
                <tr>
                  <td align="center" style="background-color: #fffbeb; border: 2px dashed #d97706; border-radius: 12px; padding: 18px 24px;">
                    <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #b45309;">${otp}</div>
                    <div style="margin-top: 8px; font-size: 12px; font-weight: 600; color: #92400e;">Valid for 3 minutes</div>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 12px; font-size: 13px; color: #64748b;">Mess owners can securely log in with OTP anytime. Never share this code.</p>
              <p style="margin: 0; font-size: 13px; color: #94a3b8;">If you did not request this login, please verify your account security.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; line-height: 1.5;">
              <p style="margin: 0 0 4px; font-weight: 600; color: #475569;">MessConnect Partner Notification</p>
              <p style="margin: 0 0 6px;">Pune, Maharashtra, India</p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">You received this email because a partner login attempt was initiated for ${kitchen}.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendEmail({ to: email, subject, html, text });
}

/**
 * 3. Send Welcome Email on Signup
 */
async function sendWelcomeEmail({ email, name, role, messName }) {
  const isOwner = role === 'OWNER';
  const subject = isOwner
    ? `Welcome to the MessConnect Partner Network - ${messName || 'Your Kitchen'}`
    : `Welcome to MessConnect, ${name}!`;

  const text = `Welcome to MessConnect!

Hello ${name || 'Friend'},

${isOwner
    ? `Congratulations on registering ${messName || 'your mess'} on MessConnect. You can now manage your dining capacity, forecast meal preparation, verify student check-ins, and receive digital payments.`
    : 'Welcome to MessConnect! Find verified messes, enjoy flexible meal pause options, and track your subscriptions effortlessly.'}

Registered Email: ${email}

--
MessConnect Team
Pune, Maharashtra, India
https://messconnect.in`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to MessConnect</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.04);">
          <tr>
            <td style="background-color: #f97316; padding: 28px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff;">MessConnect</h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #ffedd5;">Smart Mess Discovery &amp; Dining Platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 28px; color: #1e293b; line-height: 1.6;">
              <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 700; color: #0f172a;">Welcome to MessConnect, ${name || 'Friend'}!</h2>
              <p style="margin: 0 0 16px; font-size: 14px; color: #334155;">
                ${isOwner
                  ? `Congratulations on registering <strong>${messName || 'your kitchen'}</strong>. Your application is now in review and you can access your partner dashboard.`
                  : `Your student dining account is activated! You can now explore verified messes nearby, subscribe to flexible plans, and pause meals when away.`}
              </p>
              <p style="margin: 0 0 8px; font-size: 13px; color: #64748b;">Registered Account: <strong>${email}</strong></p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; line-height: 1.5;">
              <p style="margin: 0 0 4px; font-weight: 600; color: #475569;">MessConnect Team</p>
              <p style="margin: 0 0 6px;">Pune, Maharashtra, India</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendEmail({ to: email, subject, html, text });
}

/**
 * 4. Send Mess Verification Status Update (Approved / Rejected / Pending)
 */
async function sendMessStatusEmail({ email, ownerName, messName, status, reviewNotes }) {
  const isApproved = status === 'APPROVED';
  const subject = isApproved
    ? `MessConnect: ${messName} is Approved`
    : `MessConnect: Application update for ${messName}`;

  const text = `MessConnect Application Update

Dear ${ownerName || 'Partner'},

${isApproved
    ? `Congratulations! ${messName} has been approved and is now live on MessConnect for student discovery and subscriptions.`
    : `Your application for ${messName} status is currently: ${status}.`}

${reviewNotes ? `Admin Notes: ${reviewNotes}\n` : ''}
Please log in to your MessConnect Partner Portal to view details.

--
MessConnect Verification Team
Pune, Maharashtra, India`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Status Update</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.04);">
          <tr>
            <td style="background-color: ${isApproved ? '#059669' : '#d97706'}; padding: 24px; text-align: center; color: white;">
              <h2 style="margin: 0; font-size: 20px; font-weight: 700;">${isApproved ? 'Kitchen Approved & Live' : 'Application Status Update'}</h2>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px; color: #1e293b; line-height: 1.6;">
              <p style="margin: 0 0 14px; font-size: 14px; color: #334155;">Dear <strong>${ownerName || 'Partner'}</strong>,</p>
              <p style="margin: 0 0 16px; font-size: 14px; color: #334155;">
                ${isApproved
                  ? `We are pleased to inform you that <strong>${messName}</strong> has been approved and is now live on MessConnect!`
                  : `Your application for <strong>${messName}</strong> is currently marked as: <strong>${status}</strong>.`}
              </p>
              ${reviewNotes ? `<div style="background-color: #f1f5f9; padding: 14px 16px; border-radius: 8px; font-size: 13px; border-left: 4px solid #64748b; margin: 16px 0;"><strong>Compliance Notes:</strong><br>${reviewNotes}</div>` : ''}
              <p style="margin: 0; font-size: 13px; color: #64748b;">Log in to your MessConnect Partner Portal to manage your menu and listings.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
              <p style="margin: 0 0 4px;">MessConnect Verification Team &bull; Pune, Maharashtra, India</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendEmail({ to: email, subject, html, text });
}

/**
 * 5. Send Daily Menu & Kitchen Update Notification to Subscribed Students
 */
async function sendMenuUpdateEmail({ studentEmail, studentName, messName, menuToday, messImage }) {
  const subject = `📢 ${messName} Menu Updated! Today's Meals Lineup`;

  const breakfastText = Array.isArray(menuToday?.breakfast)
    ? menuToday.breakfast.join(', ')
    : (menuToday?.breakfast || 'Standard Breakfast Service');
  const lunchText = Array.isArray(menuToday?.lunch)
    ? menuToday.lunch.join(', ')
    : (menuToday?.lunch || 'Standard Lunch Service');
  const dinnerText = Array.isArray(menuToday?.dinner)
    ? menuToday.dinner.join(', ')
    : (menuToday?.dinner || 'Standard Dinner Service');

  const text = `Hello ${studentName || 'Student'},

Your subscribed mess "${messName}" has just published today's meal menu!

🌅 TODAY'S BREAKFAST:
${breakfastText}

☀️ TODAY'S LUNCH:
${lunchText}

🌙 TODAY'S DINNER:
${dinnerText}

Dining at the mess today? Present your Digital QR Meal Pass on the MessConnect Student Dashboard at the dining entrance counter.

Enjoy your hot, fresh meals!

--
MessConnect Student Alerts Team
Pune, Maharashtra, India`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${messName} - Today's Menu Updated</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
              <span style="display: inline-block; background-color: rgba(255,255,255,0.22); padding: 4px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
                Subscribed Mess Notice
              </span>
              <h1 style="margin: 10px 0 0; font-size: 22px; font-weight: 800; color: #ffffff; line-height: 1.2;">
                ${messName}
              </h1>
              <p style="margin: 4px 0 0; font-size: 13px; color: #ffedd5;">
                Today's Daily Menu Has Been Updated!
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 28px 24px; color: #1e293b; line-height: 1.6;">
              <p style="margin: 0 0 14px; font-size: 15px; color: #0f172a;">
                Hi <strong>${studentName || 'Student'}</strong>,
              </p>
              <p style="margin: 0 0 20px; font-size: 14px; color: #475569; line-height: 1.5;">
                The kitchen management at <strong>${messName}</strong> just published today's meal schedule. Here is what's on the menu today:
              </p>

              <!-- Menu Breakdown Cards -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 22px;">
                <!-- Breakfast Card -->
                <tr>
                  <td style="padding: 14px 18px; background-color: #fff7ed; border-left: 4px solid #f97316; border-radius: 10px;">
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #c2410c; margin-bottom: 4px; letter-spacing: 0.5px;">
                      🌅 Today's Breakfast
                    </div>
                    <div style="font-size: 14px; font-weight: 600; color: #1e293b; line-height: 1.4;">
                      ${breakfastText}
                    </div>
                  </td>
                </tr>
                <tr><td height="12"></td></tr>
                <!-- Lunch Card -->
                <tr>
                  <td style="padding: 14px 18px; background-color: #fefce8; border-left: 4px solid #eab308; border-radius: 10px;">
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #854d0e; margin-bottom: 4px; letter-spacing: 0.5px;">
                      ☀️ Today's Lunch
                    </div>
                    <div style="font-size: 14px; font-weight: 600; color: #1e293b; line-height: 1.4;">
                      ${lunchText}
                    </div>
                  </td>
                </tr>
                <tr><td height="12"></td></tr>
                <!-- Dinner Card -->
                <tr>
                  <td style="padding: 14px 18px; background-color: #eef2ff; border-left: 4px solid #6366f1; border-radius: 10px;">
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #3730a3; margin-bottom: 4px; letter-spacing: 0.5px;">
                      🌙 Today's Dinner
                    </div>
                    <div style="font-size: 14px; font-weight: 600; color: #1e293b; line-height: 1.4;">
                      ${dinnerText}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- QR Pass Notice -->
              <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 14px 16px; border-radius: 12px; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #64748b;">
                  📲 <strong>Ready to eat?</strong> Open your MessConnect dashboard and show your <strong>Digital Meal Pass QR</strong> at the entrance counter.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5;">
              <p style="margin: 0 0 4px; font-weight: 600; color: #64748b;">MessConnect Automated Notifications</p>
              <p style="margin: 0;">You received this update because you are an active subscriber of ${messName}.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendEmail({ to: studentEmail, subject, html, text });
}

/**
 * 6. Send Support / Inquiry Query to Admin
 */
async function sendSupportQueryEmail({
  name,
  contact,
  email,
  category = 'General Query',
  message,
  userId,
  userRole
}) {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER?.trim() || process.env.GMAIL_USER?.trim() || 'support@messconnect.in';
  const cleanName = name || 'MessConnect User';
  const cleanContact = contact || email || 'Not specified';
  const ticketId = 'MC-TKT-' + Date.now().toString().slice(-6);

  const subject = `[MessConnect Support Query] ${category} from ${cleanName} (#${ticketId})`;

  const text = `New User Query Raised on MessConnect

Ticket ID: #${ticketId}
Name: ${cleanName}
Contact / Email: ${cleanContact}
Category: ${category}
User ID: ${userId || 'Guest / Unauthenticated'}
User Role: ${userRole || 'Student / Visitor'}
Timestamp: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

Query / Message:
----------------------------------------
${message}
----------------------------------------

Please review and reply to the user directly at ${cleanContact}.`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New User Support Query</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.05);">
          <tr>
            <td style="background: linear-gradient(135deg, #ea580c, #f97316); padding: 24px 28px; text-align: left;">
              <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #ffedd5; background: rgba(0,0,0,0.15); padding: 4px 10px; border-radius: 20px;">
                Incoming Support Query
              </span>
              <h1 style="margin: 12px 0 0; font-size: 22px; font-weight: 800; color: #ffffff;">MessConnect Helpdesk Ticket</h1>
              <p style="margin: 4px 0 0; font-size: 13px; color: #ffedd5;">Ticket ID: #${ticketId}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px; color: #1e293b; line-height: 1.6;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #64748b; width: 130px; font-weight: 600;">Sender Name:</td>
                  <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: 700;">${cleanName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Contact / Phone:</td>
                  <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: 600;">${cleanContact}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Category:</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #ea580c; font-weight: 700;">${category}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">User Role:</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #475569;">${userRole || 'Student / Visitor'} (${userId || 'N/A'})</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Submitted At:</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #475569;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                </tr>
              </table>

              <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 8px; letter-spacing: 0.5px;">
                User Query / Message:
              </div>
              <div style="background-color: #ffffff; border-left: 4px solid #ea580c; border: 1px solid #e2e8f0; border-left-width: 4px; padding: 16px; border-radius: 8px; font-size: 14px; color: #1e293b; white-space: pre-wrap; line-height: 1.6;">
${message}
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 28px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
              This query was submitted on MessConnect and dispatched to <strong>${adminEmail}</strong>.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendEmail({ to: adminEmail, subject, html, text });
}

module.exports = {
  get transporter() {
    return getTransporter();
  },
  getTransporter,
  SMTP_CONFIG,
  SENDER,
  checkSmtpHealth,
  sendEmail,
  sendPasswordResetOtp,
  sendVerificationOtp,
  sendOwnerLoginOtp,
  sendWelcomeEmail,
  sendMessStatusEmail,
  sendMenuUpdateEmail,
  sendSupportQueryEmail,
  getEmailGatewayMode: () => 'GMAIL_SMTP'
};
