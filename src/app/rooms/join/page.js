// src/app/rooms/join/page.js
"use client"
import { useState } from "react"
import Link from "next/link"

export default function JoinRoomPage() {
  const [code, setCode] = useState("")

  const onSubmit = (e) => {
    e.preventDefault()
    if (!code.trim()) return
    // TODO: plus tard → vérifier le code via /api/rooms/exists et rediriger vers /rooms/[id]
    // router.push(`/rooms/${encodeURIComponent(code)}`)
    alert(`(bientôt) on tentera de rejoindre la room: ${code}`)
  }

  return (
    <div className="min-h-[70dvh] grid place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-300 dark:border-neutral-700 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Rejoindre une partie</h1>
          <Link href="/" className="text-sm underline hover:opacity-80">← Retour</Link>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="code" className="text-sm opacity-80">Code de la room</label>
            <input
              id="code"
              type="text"
              inputMode="text"
              placeholder="ex : 9b1d-…-42de"
              className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700
                         bg-white dark:bg-neutral-900 px-3 py-2 outline-none
                         focus:ring-2 focus:ring-violet-500/60"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 text-white px-4 py-2
                       hover:bg-indigo-500 transition"
          >
            Rejoindre
          </button>
        </form>
      </div>
    </div>
  )
}
