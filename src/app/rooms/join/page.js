// src/app/rooms/join/page.js
"use client"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function JoinRoomPage() {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  async function onSubmit(e) {
    e.preventDefault()
    setError("")
    const trimmed = code.trim()
    if (!trimmed) return setError("Entre un code.")

    setLoading(true)
    try {
      // (optionnel) petit contrôle de forme UUID v4
      // const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      // if (!uuidRegex.test(trimmed)) throw new Error("Code invalide.")

      const res = await fetch(`/api/rooms/${encodeURIComponent(trimmed)}`)
      if (!res.ok) throw new Error("Cette room n'existe pas.")
      // OK → on rejoint
      router.push(`/rooms/${encodeURIComponent(trimmed)}`)
    } catch (e) {
      setError(e.message || "Impossible de rejoindre la room.")
    } finally {
      setLoading(false)
    }
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
              placeholder="ex : 54ab30d8-..."
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
                       hover:bg-indigo-500 transition disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Connexion..." : "Rejoindre"}
          </button>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </form>
      </div>
    </div>
  )
}
