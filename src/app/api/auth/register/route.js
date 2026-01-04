import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { sendMail } from "@/lib/email"
import { renderVerifyEmail } from "@/lib/verify-email"

const prisma = new PrismaClient()

const randomToken = () => crypto.randomBytes(32).toString("hex")
const hashToken = (t) => crypto.createHash("sha256").update(t).digest("hex")

export async function POST(req) {
  try {
    const ct = req.headers.get("content-type") || ""
    let email, password, pseudo

    if (ct.includes("application/json")) {
      const body = await req.json()
      email = body.email
      password = body.password
      pseudo = body.pseudo
    } else {
      const form = await req.formData()
      email = form.get("email")
      password = form.get("password")
      pseudo = form.get("pseudo")
    }

    // --- validations renforcées ---
    if (!email || !password || !pseudo) {
      return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 })
    }
    email = String(email).trim().toLowerCase()
    pseudo = String(pseudo).trim()
    if (pseudo.length < 2) {
      return NextResponse.json({ ok: false, error: "INVALID_PSEUDO" }, { status: 400 })
    }
    if (String(password).length < 8) {
      return NextResponse.json({ ok: false, error: "WEAK_PASSWORD" }, { status: 400 })
    }

    // existe déjà ?
    const existing = await prisma.user.findUnique({ where: { email } })

    // existe
    if (existing) {
      return NextResponse.json({ ok: false, error: "EMAIL_TAKEN" }, { status: 409 })
    }

    // création user + token en transaction ---
    const token = randomToken()
    const tokenHash = hashToken(token)
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24)

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, passwordHash: await bcrypt.hash(password, 12), name: pseudo },
      })
      const vt = await tx.verificationToken.create({
        data: { identifier: email, token: tokenHash, expires },
      })
      return { user, vt }
    })

    console.log("[register] created user=", result.user.id, "token id=", result.vt.id)

    // Build verify URL — prefer NEXTAUTH_URL but fallback to request origin when missing
    let baseUrl = process.env.NEXTAUTH_URL
    if (!baseUrl) {
      try {
        baseUrl = new URL(req.url).origin
        console.warn('[register] NEXTAUTH_URL not set, using request origin as fallback:', baseUrl)
      } catch (e) {
        // final fallback — best effort
        const host = req.headers.get('host') || ''
        baseUrl = host ? `https://${host}` : ''
        console.warn('[register] built fallback baseUrl from host header:', baseUrl)
      }
    }

    const verifyUrl = new URL(`/api/auth/verify-email?token=${token}`, baseUrl || undefined).toString()
    const { subject, text, html } = renderVerifyEmail({ pseudo, verifyUrl })

    // Print verify URL to logs so we can manually activate accounts if needed
    console.log('[register] verifyUrl:', verifyUrl)

    // Try to send email but don't block users longer than 20s. If sending takes too long
    // return a fallback verify link immediately while allowing the send to continue in background.
    const sendPromise = sendMail({ to: email, subject, text, html })

    const timeoutMs = 20_000
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ status: 'timeout' }), timeoutMs))

    const winner = await Promise.race([
      sendPromise.then((res) => ({ status: 'ok', res })).catch((err) => ({ status: 'error', err })),
      timeoutPromise,
    ])

    if (winner.status === 'ok') {
      console.log('[register] send result:', winner.res)
    } else if (winner.status === 'error') {
      console.error('[register] send-mail error (fast):', winner.err)
      console.error('[register] verifyUrl (for manual activation):', verifyUrl)
      // Return the verify link immediately so user can activate account manually
      return NextResponse.json({ ok: true, fallbackVerifyUrl: verifyUrl, fallback: true, warning: 'SEND_FAILED' })
    } else if (winner.status === 'timeout') {
      // did not finish within timeout; let sendPromise continue and log result when done
      sendPromise
        .then((res) => console.log('[register] send result (delayed):', res))
        .catch((err) => console.error('[register] send error (delayed):', err))

      console.warn('[register] send-mail timed out after', timeoutMs, 'ms; returning fallback link')
      return NextResponse.json({ ok: true, fallbackVerifyUrl: verifyUrl, fallback: true, warning: 'SEND_TIMEOUT' })
    }

    const dev = process.env.NODE_ENV !== "production" ? { devVerifyUrl: verifyUrl } : {}
    return NextResponse.json({ ok: true, ...dev })
  } catch (e) {
    console.error("[register] SERVER_ERROR:", e)
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 })
  }
}
