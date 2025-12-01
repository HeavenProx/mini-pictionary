import "./globals.css"
import Navbar from "@/components/Navbar"

export const metadata = {
  title: "Mini Pictionary",
  description: "Multijoueur React/Next.js",
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr" data-theme="pastel">
      <body>
        <Navbar />
        <main className="container mx-auto p-4">{children}</main>
      </body>
    </html>
  )
}
