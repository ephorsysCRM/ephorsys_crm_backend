// ─────────────────────────────────────────────────────────────────────────────
//  Email Templates for Password Reset Flow
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates the password reset OTP email content.
 * @param {string} otp - The one-time password to include in the email.
 * @returns {{ subject: string, text: string, html: string }}
 */
export const getPasswordResetEmail = (otp) => {
  const subject = "Ephorsys CRM – Your Password Reset OTP";

  const text = `
Hi Admin,

You requested to reset your Ephorsys CRM password.

Your One-Time Password (OTP) is: ${otp}

This OTP is valid for 10 minutes. Do not share it with anyone.

If you did not request a password reset, please ignore this email or contact support.

— Ephorsys CRM Team
  `.trim();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Password Reset OTP</title>
</head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f6;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0c3b12 0%,#2f7c39 100%);padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:0.5px;">🔐 Password Reset</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.75);font-size:14px;">Ephorsys CRM – Admin Portal</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;color:#334155;font-size:16px;">Hi Admin,</p>
              <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">
                We received a request to reset your password. Use the OTP below to proceed. This code is valid for <strong>10 minutes</strong>.
              </p>
              <!-- OTP Box -->
              <div style="background:#f0fdf4;border:2px dashed #2f7c39;border-radius:10px;padding:24px;text-align:center;margin:24px 0;">
                <p style="margin:0 0 6px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Your One-Time Password</p>
                <p style="margin:0;color:#0c3b12;font-size:40px;font-weight:800;letter-spacing:10px;">${otp}</p>
              </div>
              <p style="margin:24px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;">
                If you did not request a password reset, please ignore this email. Your account remains secure.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">© ${new Date().getFullYear()} Ephorsys CRM. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return { subject, text, html };
};
