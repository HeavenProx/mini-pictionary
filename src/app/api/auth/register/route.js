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

    const verifyUrl = new URL(`/api/auth/verify-email?token=${token}`, process.env.NEXTAUTH_URL).toString()
    const { subject, text, html } = renderVerifyEmail({ pseudo, verifyUrl })

    try {
      await sendMail({ to: email, subject, text, html })
    } catch (err) {
      console.error("[register] SendGrid first-send error:", err)
      return NextResponse.json({ ok: false, error: "SEND_FAILED" }, { status: 502 })
    }

    const dev = process.env.NODE_ENV !== "production" ? { devVerifyUrl: verifyUrl } : {}
    return NextResponse.json({ ok: true, ...dev })
  } catch (e) {
    console.error("[register] SERVER_ERROR:", e)
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 })
  }
}
