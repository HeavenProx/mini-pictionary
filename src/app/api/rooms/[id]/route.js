// src/app/api/rooms/[id]/route.js
import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

export async function GET(_req, { params }) {
  try {
    const { id } = params
    const room = await prisma.room.findUnique({ where: { id } })
    if (room){
        return NextResponse.json({ exists: true })
    } else {
        return NextResponse.json({ exists: false }, { status: 404 })
    }
  } catch (e) {
    console.error("check room error:", e)
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 })
  }
}
