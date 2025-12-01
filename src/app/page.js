import Link from "next/link"

export default function Home() {
  return (
    <div className="max-w-xl mx-auto">
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title">Prêt à dessiner ? 🎨</h2>
          
          <p>Se connecter pour jouer</p>    

          <Link href="/playDraw" className="px-3 py-2 text-sm rounded-lg
              bg-indigo-600 text-white hover:bg-indigo-500
              dark:bg-indigo-500 dark:hover:bg-indigo-400 transition shadow-sm">
            Jouer
        </Link>       
        </div>
      </div>
    </div>
  )
}
