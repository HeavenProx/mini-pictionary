"use client"
import { useEffect, useState } from "react"

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const [dark, setDark] = useState(false)

  const getIsDark = () =>
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")

  // applique + persiste
  const apply = (isDark) => {
    const el = document.documentElement
    el.classList.toggle("dark", isDark)
    localStorage.setItem("theme", isDark ? "dark" : "light")
    setDark(isDark)
  }

  useEffect(() => {
    setMounted(true)

    // état initial (localStorage > media query)
    const saved = typeof window !== "undefined" ? localStorage.getItem("theme") : null
    const prefersDark =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches

    const initial = saved ? saved === "dark" : prefersDark
    apply(initial)

    // sync si un autre onglet change le thème
    const onStorage = (e) => {
      if (e.key === "theme") apply(e.newValue === "dark")
    }
    window.addEventListener("storage", onStorage)

    // si l’utilisateur change le thème système *et* qu’aucun choix n’est forcé
    const mql = window.matchMedia?.("(prefers-color-scheme: dark)")
    const onMQ = () => {
      if (!localStorage.getItem("theme")) apply(mql.matches)
    }
    mql?.addEventListener?.("change", onMQ)

    return () => {
      window.removeEventListener("storage", onStorage)
      mql?.removeEventListener?.("change", onMQ)
    }
  }, [])

  const toggle = () => apply(!getIsDark())

  if (!mounted) {
    return (
      <div
        className="h-9 w-9 rounded-full border
                   border-neutral-300 dark:border-neutral-700"
        aria-hidden
      />
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full
                 border border-neutral-300 dark:border-neutral-700
                 bg-white/80 dark:bg-neutral-800/80
                 hover:bg-neutral-100 dark:hover:bg-neutral-700
                 transition cursor-pointer"
      aria-label="Changer de thème"
      title={dark ? "Thème sombre" : "Thème clair"}
    >
      {/* Lune quand sombre */}
      <svg
        className={`${dark ? "block" : "hidden"} h-5 w-5`}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
      </svg>

      {/* Soleil quand clair */}
      <svg
        className={`${dark ? "hidden" : "block"} h-5 w-5`}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.8 1.42-1.42zM1 13h3v-2H1v2zm9-9h2V1h-2v3zm7.04.05l1.79-1.8-1.41-1.41-1.8 1.79 1.42 1.42zM20 11v2h3v-2h-3zm-8 8h2v3h-2v-3zm6.24.16l1.8 1.79 1.41-1.41-1.79-1.8-1.42 1.42zM4.96 19.95l-1.79 1.8 1.41 1.41 1.8-1.79-1.42-1.42zM12 6a6 6 0 100 12 6 6 0 000-12z" />
      </svg>
    </button>
  )
}
