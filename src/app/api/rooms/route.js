// src/app/api/rooms/route.js
import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}))
    const hostId = body?.hostId || null
    const room = await prisma.room.create({ data: { hostId } })
    return NextResponse.json({ id: room.id })
  } catch (e) {
    console.error("create room error:", e)
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 })
  }
}
