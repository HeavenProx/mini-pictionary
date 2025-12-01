"use client"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"

export default function UserBox() {
  const { data: session, status } = useSession()
  const name = session?.user?.name || session?.user?.email?.split("@")[0] || "Joueur"

  if (status === "authenticated") {
    return (
      <div className="flex items-center gap-2 min-w-0">
        {/* Smiley */}
       <svg
            className="h-5 w-5 opacity-80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            >
            <circle cx="12" cy="12" r="9" />
            <path d="M8 14s1.8 2 4 2 4-2 4-2" />
            <circle cx="9" cy="10" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="15" cy="10" r="1.2" fill="currentColor" stroke="none" />
        </svg>


        {/* Username */}
        <span className="truncate max-w-[12rem] font-medium">
          {name}
        </span>

        {/* Déconnexion (petit bouton fantôme) */}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="px-3 py-2 text-sm rounded-lg border
                     border-neutral-300/70 dark:border-neutral-700/70
                     hover:bg-base-100 dark:hover:bg-base-800 transition"
        >
          Se déconnecter
        </button>
      </div>
    )
  }

  // Non connecté → tes deux liens d'origine
  return (
    <div className="justify-self-end flex items-center gap-2 min-w-0">
      <Link
        href="/login"
        className="px-3 py-2 text-sm rounded-lg border border-base-300 hover:bg-base-200 transition">
        Se connecter
      </Link>
      <Link
        href="/register"
        className="px-3 py-2 text-sm rounded-lg bg-primary text-primary-content hover:bg-primary/90 transition shadow-sm">
        Inscription
      </Link>
    </div>
  )
}
