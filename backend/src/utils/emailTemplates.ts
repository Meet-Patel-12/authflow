const currentYear = new Date().getFullYear();

const baseStyles = `
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
  .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
  .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
  .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
`;

const footer = `
  <div class="footer">
    <p>© ${currentYear} Auth Platform. All rights reserved.</p>
  </div>
`;

const linkBlock = (url: string) => `
  <p>Or copy and paste this link in your browser:</p>
  <p style="word-break: break-all; color: #667eea;">${url}</p>
`;

export const verificationEmailTemplate = (
  name: string,
  url: string,
): string => {
  return `
    <!DOCTYPE html>
    <html>
      <head><style>${baseStyles}</style></head>
      <body>
        <div class="container">
          <div class="header"><h1>Verify Your Email</h1></div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>Thank you for signing up! Please verify your email address to complete your registration.</p>
            <p style="text-align: center;">
              <a href="${url}" class="button">Verify Email Address</a>
            </p>
            ${linkBlock(url)}
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account, you can safely ignore this email.</p>
          </div>
          ${footer}
        </div>
      </body>
    </html>
  `;
};

export const passwordResetEmailTemplate = (
  name: string,
  url: string,
): string => {
  return `
    <!DOCTYPE html>
    <html>
      <head><style>${baseStyles}</style></head>
      <body>
        <div class="container">
          <div class="header"><h1>Reset Your Password</h1></div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <p style="text-align: center;">
              <a href="${url}" class="button">Reset Password</a>
            </p>
            ${linkBlock(url)}
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
          </div>
          ${footer}
        </div>
      </body>
    </html>
  `;
};

export const magicLinkEmailTemplate = (name: string, url: string): string => {
  return `
    <!DOCTYPE html>
    <html>
      <head><style>${baseStyles}</style></head>
      <body>
        <div class="container">
          <div class="header"><h1>Your Magic Link</h1></div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>Click the button below to sign in to your account:</p>
            <p style="text-align: center;">
              <a href="${url}" class="button">Sign In</a>
            </p>
            ${linkBlock(url)}
            <p>This link will expire in 15 minutes.</p>
            <p>If you didn't request this link, you can safely ignore this email.</p>
          </div>
          ${footer}
        </div>
      </body>
    </html>
  `;
};

export const mfaCodeEmailTemplate = (name: string, code: string): string => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          ${baseStyles}
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; text-align: center; }
          .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea; padding: 20px; background: white; border-radius: 5px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>Your Verification Code</h1></div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>Your verification code is:</p>
            <div class="code">${code}</div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
          ${footer}
        </div>
      </body>
    </html>
  `;
};

export const invitationEmailTemplate = (
  inviterName: string,
  organizationName: string,
  url: string,
): string => {
  return `
    <!DOCTYPE html>
    <html>
      <head><style>${baseStyles}</style></head>
      <body>
        <div class="container">
          <div class="header"><h1>You're Invited!</h1></div>
          <div class="content">
            <p>Hi there,</p>
            <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on AuthFlow.</p>
            <p style="text-align: center;">
              <a href="${url}" class="button">Accept Invitation</a>
            </p>
            ${linkBlock(url)}
            <p>This invitation will expire in 7 days.</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
          ${footer}
        </div>
      </body>
    </html>
  `;
};
