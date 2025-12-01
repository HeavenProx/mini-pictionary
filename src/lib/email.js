import sgMail from "@sendgrid/mail"

const PROVIDER = process.env.MAIL_PROVIDER || "console"

export async function sendMail({ to, subject, text, html }) {
  const from = process.env.MAIL_FROM
  if (PROVIDER !== "sendgrid" || !process.env.SENDGRID_API_KEY) {
    console.log("[DEV EMAIL] to:", to, "subj:", subject)
    return { id: "dev-log" }
  }
  if (!from) throw new Error("MAIL_FROM manquant")

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
