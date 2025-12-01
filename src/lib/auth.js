import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"

export const authOptions = {
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        try {
          const { email, password } = credentials ?? {}
          if (!email || !password) return null

          const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
          if (!user) return null

          const ok = await bcrypt.compare(password, user.passwordHash)
          if (!ok) return null

          if (!user.emailVerified) {
            throw new Error("EMAIL_NOT_VERIFIED")
          }

          return { id: user.id, email: user.email, name: user.name }
        } catch (err) {
          if (process.env.NODE_ENV !== "production") {
            console.error("[authorize] error:", err)
          }
          throw err
        }
      },

    }),
  ],
  pages: {signIn: "/login", error: "/login",},
  callbacks: {
    async jwt({ token, user }) { if (user) Object.assign(token, { id:user.id, email:user.email, name:user.name }); return token },
    async session({ session, token }) { if (session.user) Object.assign(session.user, { id:token.id, email:token.email, name:token.name }); return session },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
