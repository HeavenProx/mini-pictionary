import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import crypto from "crypto"

const prisma = new PrismaClient()
const hashToken = (t) => crypto.createHash("sha256").update(t).digest("hex")

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")
    // prefer the configured NEXTAUTH_URL for redirects, fallback to request origin
    const baseUrl = process.env.NEXTAUTH_URL || new URL(req.url).origin

    if (!token) {
      return NextResponse.redirect(new URL("/login?verified=0", baseUrl))
    }

    const tokenHash = hashToken(token)

    const vt = await prisma.verificationToken.findUnique({
      where: { token: tokenHash },
    })

    if (!vt) {
      return NextResponse.redirect(new URL("/login?verified=0&reason=invalid", baseUrl))
    }
    if (vt.expires < new Date()) {
      // on peut supprimer le token expiré
      await prisma.verificationToken.delete({ where: { token: tokenHash } })
      return NextResponse.redirect(new URL("/login?verified=0&reason=expired", baseUrl))
    }

    // marquer l'user comme vérifié
    await prisma.user.update({
      where: { email: vt.identifier },
      data: { emailVerified: new Date() },
    })

    // consommer le token
    await prisma.verificationToken.delete({ where: { token: tokenHash } })

    return NextResponse.redirect(new URL("/login?verified=1", baseUrl), 303)
  } catch (e) {
    console.error(e)
    return NextResponse.redirect(new URL("/login?verified=0&reason=error", req.url))
  }
}
