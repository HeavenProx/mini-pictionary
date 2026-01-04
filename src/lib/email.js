import sgMail from "@sendgrid/mail"
import { Resend } from "resend"
import nodemailer from "nodemailer"

const PROVIDER = process.env.MAIL_PROVIDER || "console"

export async function sendMail({ to, subject, text, html }) {
  const from = process.env.MAIL_FROM
  if (!from) throw new Error("MAIL_FROM manquant")

  // Resend provider (recommended free alternative)
  if (PROVIDER === "resend") {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[Resend] RESEND_API_KEY missing, falling back to dev log')
      console.log("[DEV EMAIL] to:", to, "subj:", subject)
      return { id: "dev-log" }
    }
    const resend = new Resend(process.env.RESEND_API_KEY)
    try {
      const res = await resend.emails.send({ from, to, subject, html, text })
      // Log full response to help debug missing messages in dashboard
      try {
        console.log("[Resend] response:", JSON.stringify(res))
      } catch (e) {
        console.log("[Resend] response (couldn't stringify):", res)
      }
      if (!res?.id) {
        console.warn('[Resend] send returned no id, response:', res)
        // If Resend returned a non-2xx status (validation error), treat as failure so caller sees it.
        if (res?.statusCode && res.statusCode >= 300) {
          const msg = res?.message || JSON.stringify(res)
          console.error('[Resend] non-2xx response:', res?.statusCode, msg)
          const err = new Error(`Resend error ${res?.statusCode}: ${msg}`)
          err.response = res
          throw err
        }
      }
      return { id: res?.id || "resend" }
    } catch (err) {
      console.error('[Resend] send error:', err)
      throw err
    }
  }

  // SMTP provider (uses nodemailer) — debug log all env vars and force error in prod if missing
  if (PROVIDER === "smtp") {
    // Debug log all SMTP env vars
    console.log('[SMTP][DEBUG] ENV:', {
      MAIL_FROM: process.env.MAIL_FROM,
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_SECURE: process.env.SMTP_SECURE,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS ? '***' : undefined,
      NODE_ENV: process.env.NODE_ENV,
    });
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      const msg = '[SMTP] missing SMTP credentials: ' + JSON.stringify({
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_USER: process.env.SMTP_USER,
        SMTP_PASS: process.env.SMTP_PASS ? '***' : undefined,
      });
      if (process.env.NODE_ENV === 'production') {
        console.error(msg);
        throw new Error(msg);
      } else {
        console.warn(msg + ' — falling back to dev log');
        console.log("[DEV EMAIL] to:", to, "subj:", subject);
        return { id: "dev-log" };
      }
    }
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: (process.env.SMTP_SECURE === "true") || false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    try {
      const info = await transporter.sendMail({ from, to, subject, text, html });
      console.log('[SMTP] sent messageId:', info?.messageId, 'response:', info?.response);
      return { id: info?.messageId || 'smtp' };
    } catch (err) {
      console.error('[SMTP] send error:', err);
      throw err;
    }
  }

  // SendGrid provider (legacy)
  if (PROVIDER !== "sendgrid" || !process.env.SENDGRID_API_KEY) {
    console.log("[DEV EMAIL] to:", to, "subj:", subject)
    return { id: "dev-log" }
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY)

  const [res] = await sgMail.send({ to, from, subject, text, html })

  // logs utiles
  console.log("[SendGrid] status:", res?.statusCode,
              "message-id:", res?.headers?.["x-message-id"])

  if (res?.statusCode >= 300) {
    throw new Error("SendGrid non-2xx: " + res?.statusCode)
  }
  return { id: res?.headers?.["x-message-id"] || "sendgrid" }
}
