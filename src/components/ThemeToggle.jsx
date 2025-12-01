"use client"
import { useEffect, useState } from "react"

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState("pastel")

  useEffect(() => {
    setMounted(true)
    const saved = typeof window !== "undefined" ? localStorage.getItem("theme") : null
    const initial = saved || document.documentElement.getAttribute("data-theme") || "pastel"
    setTheme(initial)
    document.documentElement.setAttribute("data-theme", initial)
  }, [])

  const isDark = theme === "dark"
  const toggle = () => {
    const next = isDark ? "pastel" : "dark"
    setTheme(next)
    document.documentElement.setAttribute("data-theme", next)
    localStorage.setItem("theme", next)
  }

  if (!mounted) {
    return (
      <div
        className="inline-flex h-9 w-9 items-center justify-center rounded-full
                   ring-1 ring-neutral-300/60 dark:ring-neutral-700/60
                   bg-neutral-50 dark:bg-neutral-900"
        aria-hidden
      />
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full
                 ring-1 ring-neutral-300/60 dark:ring-neutral-700/60
                 bg-neutral-50/80 dark:bg-neutral-900/80
                 hover:bg-neutral-100 dark:hover:bg-neutral-800
                 transition"
      aria-label="Changer de thème"
      title={isDark ? "Thème sombre" : "Thème clair"}
    >
      {/* Soleil */}
      <svg
        className={`${isDark ? "hidden" : "block"} h-5 w-5`}
        viewBox="0 0 24 24" fill="currentColor"
      >
        <path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.8 1.42-1.42zM1 13h3v-2H1v2zm9-9h2V1h-2v3zm7.04.05l1.79-1.8-1.41-1.41-1.8 1.79 1.42 1.42zM20 11v2h3v-2h-3zm-8 8h2v3h-2v-3zm6.24.16l1.8 1.79 1.41-1.41-1.79-1.8-1.42 1.42zM4.96 19.95l-1.79 1.8 1.41 1.41 1.8-1.79-1.42-1.42zM12 6a6 6 0 100 12 6 6 0 000-12z" />
      </svg>
      {/* Lune */}
      <svg
        className={`${isDark ? "block" : "hidden"} h-5 w-5`}
        viewBox="0 0 24 24" fill="currentColor"
      >
        <path d="M12 2a9.99 9.99 0 018.94 5.56A8 8 0 1111 3.06 9.98 9.98 0 0112 2z" />
      </svg>
    </button>
  )
}
