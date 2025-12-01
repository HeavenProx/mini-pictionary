"use client"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useSearchParams, useRouter } from "next/navigation"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const search = useSearchParams()
  const router = useRouter()

  const verifiedFlag = search.get("verified") // ?verified=1 après clic d’email

  async function onSubmit(e) {
    e.preventDefault()               
    setError("")
    setLoading(true)

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,                
    })
    setLoading(false)
    if (res?.ok) return router.push("/") 
    if (res?.error === "EMAIL_NOT_VERIFIED") {
      setError("Ton email n'est pas vérifié.")
    } else {
      setError("Email ou mot de passe incorrect.")
    }
  }

  return (
    <div className="min-h-[70dvh] grid place-items-center px-4">
      <div className="card w-full max-w-md bg-dark-100 border border-base-300 shadow-xl rounded-2xl">
        <div className="card-body p-5">
          <h2 className="card-title text-2xl text-center">Se connecter</h2>
          <p className="text-sm opacity-70 text-center">Entre tes identifiants ci-dessous.</p>

          {verifiedFlag === "1" && (
            <div className="alert alert-success mt-3">
              <span>Email vérifié, tu peux te connecter ✅</span>
            </div>
          )}

          {error && (
            <div className="alert alert-error mt-3">
              <span>{error}</span>
            </div>
          )}

          <form className="mt-4 p-5 space-y-4" onSubmit={onSubmit}>
            <div className="form-control">
              <label htmlFor="email" className="label">
                <span className="label-text">Email</span>
              </label>
              <input
                id="email"
                type="email"
                className="input input-bordered w-full rounded px-2 py-1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-control">
              <label htmlFor="password" className="label">
                <span className="label-text">Mot de passe</span>
              </label>
              <input
                id="password"
                type="password"
                className="input input-bordered w-full rounded px-2 py-1"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              className="btn w-full rounded-xl"
              disabled={loading}
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <div className="text-sm text-center mt-2">
            <a href="/register" className="link link-primary">Créer un compte</a>
          </div>
        </div>
      </div>
    </div>
  )
}
