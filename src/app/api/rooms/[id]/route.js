import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// évite tout cache côté Next/edge pour cette route
export const dynamic = "force-dynamic"

export async function GET(_req, context) {
  try {
    // ⚠️ sur Next 15, params peut être async → on l'attend
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ exists: false, error: "MISSING_ID" }, { status: 400 })
    }

    const room = await prisma.room.findUnique({ where: { id } })
    if (!room) {
      return NextResponse.json({ exists: false }, { status: 404 })
    }

    return NextResponse.json({ exists: true }, { status: 200 })
  } catch (e) {
    console.error("[api/rooms/[id]] GET error:", e)
    return NextResponse.json({ exists: false, error: "SERVER_ERROR" }, { status: 500 })
  }
}
