// src/app/page.js
"use client";
/* eslint-disable react/no-unescaped-entities */

import Link from "next/link";
import { useSession } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();
  const isAuth = status === "authenticated";
  return (
    <div className="min-h-[70dvh] grid place-items-center px-4">
      <section className="w-full max-w-3xl">
        <h1 className="text-3xl font-bold text-center">Mini Pictionary</h1>
        {!isAuth ? (
          <div className="mt-8 text-center">
            <p className="text-lg font-semibold text-red-600">
              Vous devez être connecté pour jouer ou voir l'historique des parties.
            </p>
            <Link
              href="/login"
              className="inline-block mt-4 px-6 py-2 rounded bg-violet-600 text-white font-semibold hover:bg-violet-700 transition"
            >
              Se connecter
            </Link>
          </div>
        ) : (
          <>
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
                  Génère un code et deviens l&apos;hôte de la room.
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
                  Entre le code partagé par l&apos;hôte et rejoins la room.
                </p>
              </Link>

              {/* Historique des parties */}
              <Link
                href="/history"
                className="group mt-5 rounded-2xl border border-neutral-300 dark:border-neutral-700
                            p-6 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition block"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full
                                    bg-gradient-to-br from-violet-600 to-green-400 text-white shadow">
                    🏆
                  </span>
                  <h2 className="text-lg font-semibold">Historique & Scores</h2>
                </div>
                <p className="mt-2 text-sm opacity-80">
                  Consulte tes parties jouées et les scores gagnants.
                </p>
              </Link>
            </div>
          </>
        )}
      </section>
    </div>
  );
}