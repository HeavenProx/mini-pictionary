import nodemailer from "nodemailer"

const PROVIDER = process.env.MAIL_PROVIDER || "smtp"

export async function sendMail({ to, subject, text, html }) {
  const from = process.env.MAIL_FROM
  if (!from) throw new Error("MAIL_FROM manquant")

  // Console provider (simple logging, useful for local/dev)
  if (PROVIDER === "console") {
    console.log("[DEV EMAIL] to:", to, "subj:", subject, "html:", html)
    return { id: "dev-log" }
  }

  // Resend provider (API)
  if (PROVIDER === "resend") {
    const key = process.env.RESEND_API_KEY
    if (!key) {
      const msg = '[RESEND] missing RESEND_API_KEY'
      console.error(msg)
      if (process.env.NODE_ENV === 'production') throw new Error(msg)
      console.warn(msg + ' — falling back to dev log')
      console.log("[DEV EMAIL] to:", to, "subj:", subject)
      return { id: 'dev-log' }
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({ from, to, subject, text, html }),
      })

      const body = await res.text()
      let json
      try { json = JSON.parse(body) } catch(e) { json = null }

      if (!res.ok) {
        console.error('[RESEND] send failed', res.status, body)
        throw new Error('[RESEND] send failed: ' + (json?.message || body || res.status))
      }

      console.log('[RESEND] sent id:', json?.id || '(no-id)')
      return { id: json?.id || 'resend' }
    } catch (err) {
      console.error('[RESEND] error:', err)
      throw err
    }
  }

  // SMTP provider (uses nodemailer)
  if (PROVIDER === "smtp") {
    // Debug log all SMTP env vars (hide password)
    console.log('[SMTP][DEBUG] ENV:', {
      MAIL_FROM: process.env.MAIL_FROM,
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_SECURE: process.env.SMTP_SECURE,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS ? '***' : undefined,
      NODE_ENV: process.env.NODE_ENV,
    })

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      const msg = '[SMTP] missing SMTP credentials: ' + JSON.stringify({
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_USER: process.env.SMTP_USER,
        SMTP_PASS: process.env.SMTP_PASS ? '***' : undefined,
      })
      if (process.env.NODE_ENV === 'production') {
        console.error(msg)
        throw new Error(msg)
      } else {
        console.warn(msg + ' — falling back to dev log')
        console.log("[DEV EMAIL] to:", to, "subj:", subject)
        return { id: "dev-log" }
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
    })

    try {
      const info = await transporter.sendMail({ from, to, subject, text, html })
      console.log('[SMTP] sent messageId:', info?.messageId, 'response:', info?.response)
      return { id: info?.messageId || 'smtp' }
    } catch (err) {
      console.error('[SMTP] send error:', err)
      throw err
    }
  }

  // Unknown provider — fallback to dev log
  console.warn('[email] Unknown MAIL_PROVIDER:', PROVIDER, ' — falling back to dev log')
  console.log("[DEV EMAIL] to:", to, "subj:", subject)
  return { id: "dev-log" }

}
