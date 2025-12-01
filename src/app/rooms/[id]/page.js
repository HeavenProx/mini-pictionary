// src/app/rooms/[id]/page.js
"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useRoomSocket } from "@/hooks/useRoomSocket"
import Link from "next/link"

export default function RoomPage() {
  const { id } = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const user = { id: session?.user?.id, name: session?.user?.name || "Anonyme" }

  const [exists, setExists] = useState(null)
  const { participants } = useRoomSocket(id, user)

  // vérifier que la room existe
  useEffect(() => {
    let abort = false
    ;(async () => {
      const res = await fetch(`/api/rooms/${id}`)
      if (abort) return
      setExists(res.ok)
      if (!res.ok) setTimeout(() => router.replace("/rooms/join"), 1500)
    })()
    return () => { abort = true }
  }, [id])

  if (exists === false) {
    return (
      <div className="min-h-[60dvh] grid place-items-center">
        <p>Room introuvable… redirection…</p>
      </div>
    )
  }

  return (
    <div className="min-h-[70dvh] px-4 py-6">
      <div className="mx-auto max-w-5xl grid gap-4 md:grid-cols-[1fr_320px]">
        {/* Zone “canvas” placeholder */}
        <div className="rounded-xl border border-neutral-300 dark:border-neutral-700 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Room {id.slice(0,8)}…</h1>
            <Link href="/" className="text-sm underline">Quitter</Link>
          </div>
          <div className="mt-4 h-[420px] rounded-lg bg-neutral-100 dark:bg-neutral-800" />
          <p className="mt-3 text-sm opacity-70">Ici on posera le canvas de dessin.</p>
        </div>

        {/* Sidebar: participants temps réel */}
        <aside className="rounded-xl border border-neutral-300 dark:border-neutral-700 p-4">
          <h2 className="text-lg font-semibold">Joueurs ({participants.length})</h2>
          <ul className="mt-3 space-y-2">
            {participants.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="truncate">{p.name}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm opacity-70">
            Connexion temps réel via Socket.IO — rejoint automatiquement la room<span className="font-mono"> #{id}</span>.
          </p>
        </aside>
      </div>
    </div>
  )
}
