// components/Navbar.jsx
"use client"
import Link from "next/link"
import ThemeToggle from "./ThemeToggle"
import UserBox from "@/components/UserBox"

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur
                       bg-white/80 text-neutral-900
                       dark:bg-neutral-900/80 dark:text-neutral-100
                       border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center">
          <div className="justify-self-start min-w-0">
            <ThemeToggle />
          </div>

          <Link href="/" className="justify-self-center flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl
                             bg-gradient-to-br from-violet-600 to-fuchsia-500
                             text-white shadow">✏️</span>
            <span className="text-lg font-semibold tracking-tight">Mini Pictionary</span>
          </Link>

          <div className="justify-self-end">
            <UserBox />
          </div>
        </div>
      </div>
    </header>
  )
}
