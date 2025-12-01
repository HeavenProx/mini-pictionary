// src/app/api/rooms/route.js
import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

export async function POST(req) {
  try {
    // plus tard: lire le user de la session et mettre hostId
    const room = await prisma.room.create({ data: {} })
    return NextResponse.json({ id: room.id })
  } catch (e) {
    console.error("create room error:", e)
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 })
  }
}
