import sgMail from "@sendgrid/mail"
import { Resend } from "resend"

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
    const res = await resend.emails.send({ from, to, subject, html, text })
    console.log("[Resend] sent, id:", res?.id)
    return { id: res?.id || "resend" }
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
