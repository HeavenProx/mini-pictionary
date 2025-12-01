import { PrismaClient } from "@prisma/client"

let prisma
if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient()
} else {
  // évite l'erreur "Too many Prisma Clients" en dev
  if (!global.prisma) global.prisma = new PrismaClient()
  prisma = global.prisma
}

export default prisma
