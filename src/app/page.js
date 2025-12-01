// src/app/page.js
"use client"
import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-[70dvh] grid place-items-center px-4">
      <section className="w-full max-w-3xl">
        <h1 className="text-3xl font-bold text-center">Mini Pictionary</h1>
        <p className="mt-2 text-center text-sm opacity-80">
          Crée une partie et invite tes amis, ou rejoins une partie existante avec un code.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {/* Créer une partie */}
          <Link
            href="/rooms/create"
            className="group rounded-2xl border border-neutral-300 dark:border-neutral-700
                       p-6 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition block"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full
                               bg-gradient-to-br from-red-700 to-green-700 text-white shadow">
                +
              </span>
              <h2 className="text-lg font-semibold">Créer une partie</h2>
            </div>
            <p className="mt-2 text-sm opacity-80">
              Génère un code et deviens l'hôte de la room.
            </p>
          </Link>

          {/* Rejoindre une partie */}
          <Link
            href="/rooms/join"
            className="group rounded-2xl border border-neutral-300 dark:border-neutral-700
                       p-6 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition block"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full
                               bg-gradient-to-br from-blue-600 to-orange-500 text-white shadow">
                -
              </span>
              <h2 className="text-lg font-semibold">Rejoindre une partie</h2>
            </div>
            <p className="mt-2 text-sm opacity-80">
              Entre le code partagé par l'hôte et rejoins la room.
            </p>
          </Link>
        </div>
      </section>
    </div>
  )
}
