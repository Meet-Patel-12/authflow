import { transporter } from "../config/email";
import {
  verificationEmailTemplate,
  passwordResetEmailTemplate,
  magicLinkEmailTemplate,
  mfaCodeEmailTemplate,
  invitationEmailTemplate,
} from "../utils/emailTemplates";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const FROM = process.env.EMAIL_FROM || "noreply@authplatform.com";
const FRONTEND_URL = process.env.FRONTEND_URL;
const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    await transporter.sendMail({ from: FROM, ...options });
    console.log(`✅ Email sent to ${options.to}`);
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    throw new Error("Failed to send email");
  }
};

export const sendVerificationEmail = async (
  email: string,
  token: string,
  name: string,
): Promise<void> => {
  const url = `${FRONTEND_URL}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Verify Your Email Address",
    html: verificationEmailTemplate(name, url),
    text: `Please verify your email by visiting: ${url}`,
  });
};

export const sendPasswordResetEmail = async (
  email: string,
  token: string,
  name: string,
): Promise<void> => {
  const url = `${FRONTEND_URL}/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Reset Your Password",
    html: passwordResetEmailTemplate(name, url),
    text: `Reset your password by visiting: ${url}`,
  });
};

export const sendMagicLinkEmail = async (
  email: string,
  token: string,
  name: string,
): Promise<void> => {
  const url = `${FRONTEND_URL}/magic-link?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Your Magic Link to Sign In",
    html: magicLinkEmailTemplate(name, url),
    text: `Sign in by visiting: ${url}`,
  });
};

export const sendMFACodeEmail = async (
  email: string,
  code: string,
  name: string,
): Promise<void> => {
  await sendEmail({
    to: email,
    subject: "Your Verification Code",
    html: mfaCodeEmailTemplate(name, code),
    text: `Your verification code is: ${code}`,
  });
};

export const sendInvitationEmail = async (
  email: string,
  token: string,
  organizationName: string,
  inviterName: string,
): Promise<void> => {
  const url = `${FRONTEND_URL}/invite?token=${token}`;
  await sendEmail({
    to: email,
    subject: `You've been invited to join ${organizationName}`,
    html: invitationEmailTemplate(inviterName, organizationName, url),
    text: `You've been invited to join ${organizationName}. Accept your invitation at: ${url}`,
  });
};
