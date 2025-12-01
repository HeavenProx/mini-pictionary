import "./globals.css"
import Navbar from "@/components/Navbar"
import Providers from "./providers"

export const metadata = {
  title: "Mini Pictionary",
  description: "Multijoueur React/Next.js",
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr" data-theme="pastel">
      <body>
        <Providers>
        <Navbar />
        <main className="container mx-auto p-4">{children}</main>
        </Providers>
      </body>
    </html>
  )
}