"use client"
import Link from "next/link"
import ThemeToggle from "./ThemeToggle"
import UserBox from "@/components/UserBox"

export default function Navbar() {
    return (
        <header className="sticky top-0 z-50 border-b border-neutral-200/70 dark:border-neutral-800/70
                            bg-white/70 dark:bg-neutral-950/70 backdrop-blur">
            <div className="mx-auto max-w-6xl px-4">
                <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center">
                    {/* Toggle theme dark/light */}
                    <div className="justify-self-start min-w-0">
                        <ThemeToggle />
                    </div>

                    {/* Centre : brand toujours centré */}
                    <Link href="/" className="justify-self-center flex items-center gap-2">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl
                                        bg-gradient-to-br from-red-500 to-purple-800 text-white shadow">✏️</span>
                        <span className="text-lg font-semibold tracking-tight">Mini Pictionary</span>
                    </Link>

                    {/* Actions */}
                    <div className="justify-self-end">
                      <UserBox />
                    </div>
                </div>
            </div>
        </header>
    )
}
