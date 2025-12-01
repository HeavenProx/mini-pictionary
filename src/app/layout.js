import "./globals.css"
import Navbar from "@/components/Navbar"
import Providers from "./providers"
import Script from "next/script"

export const metadata = { title: "Mini Pictionary", description: "Multijoueur React/Next.js" }

export default function RootLayout({ children }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            (function () {
              try {
                var saved = localStorage.getItem('theme'); // "dark" | "light" | null
                var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                var isDark = saved ? saved === 'dark' : prefersDark;
                var el = document.documentElement;
                el.classList.toggle('dark', isDark);
              } catch(e) {}
            })();
          `}
        </Script>
        <meta name="color-scheme" content="dark light" />
      </head>
      <body className="bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100" suppressHydrationWarning>
        <Providers>
          <Navbar />
          <main className="container mx-auto p-4">{children}</main>
        </Providers>
      </body>
    </html>
  )
}
