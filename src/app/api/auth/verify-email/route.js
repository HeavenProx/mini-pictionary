import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import crypto from "crypto"

const prisma = new PrismaClient()
const hashToken = (t) => crypto.createHash("sha256").update(t).digest("hex")

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")
    if (!token) {
      return NextResponse.redirect(new URL("/login?verified=0", req.url))
    }

    const tokenHash = hashToken(token)

    const vt = await prisma.verificationToken.findUnique({
      where: { token: tokenHash },
    })

    if (!vt) {
      return NextResponse.redirect(new URL("/login?verified=0&reason=invalid", req.url))
    }
    if (vt.expires < new Date()) {
      // on peut supprimer le token expiré
      await prisma.verificationToken.delete({ where: { token: tokenHash } })
      return NextResponse.redirect(new URL("/login?verified=0&reason=expired", req.url))
    }

    // marquer l'user comme vérifié
    await prisma.user.update({
      where: { email: vt.identifier },
      data: { emailVerified: new Date() },
    })

    // consommer le token
    await prisma.verificationToken.delete({ where: { token: tokenHash } })

    return NextResponse.redirect(new URL("/login?verified=1", req.url), 303)
  } catch (e) {
    console.error(e)
    return NextResponse.redirect(new URL("/login?verified=0&reason=error", req.url))
  }
}
