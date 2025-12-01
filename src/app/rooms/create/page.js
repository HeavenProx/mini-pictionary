// src/app/rooms/create/page.js
"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function CreateRoomPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")

  async function handleCreate() {
    setErr("")
    setLoading(true)
    try {
      const res = await fetch("/api/rooms", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      router.push(`/rooms/${data.id}`)
    } catch (e) {
      setErr("Impossible de créer la room." + e)
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="min-h-[70dvh] grid place-items-center px-4">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-300 dark:border-neutral-700 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Créer une partie</h1>
          <Link href="/" className="text-sm underline hover:opacity-80">← Retour</Link>
        </div>

        <p className="mt-2 text-sm opacity-80">
          Ici, on génèrera un code de room (UUID) et on créera l’entrée en BDD.
        </p>

        <div className="mt-6 flex gap-3">
            {/* btn créer */}
            <button
                type="button"
                className="px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition"
                onClick={handleCreate}
                disabled={loading}
            >
                {loading ? "Création..." : "Générer la room"}
            </button>
            {err && <p className="text-sm text-red-500 mt-2">{err}</p>}

            <button
                type="button"
                className="px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                // TODO: plus tard → copier le code dans le presse-papiers
            >
                Copier le code
            </button>
        </div>

        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-4">
          <p className="text-sm opacity-80">Code de la room :</p>
          <p className="mt-1 text-lg font-mono">— — — — — — — —</p>
        </div>
      </div>
    </div>
  )
}
