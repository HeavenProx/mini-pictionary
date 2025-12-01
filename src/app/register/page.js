"use client"
import { useState } from "react"

export default function Register() {
  const [pseudo, setPseudo] = useState("")
  const [email, setEmail]   = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState("")
  const [ok, setOk]         = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError("")
    setOk(false)
    setLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pseudo, email, password }),
      })
        const data = await res.json()
        if (!res.ok) {
            if (data?.error === "EMAIL_TAKEN") setError("Cet email est déjà utilisé.")
                else if (data?.error === "MISSING_FIELDS") setError("Tous les champs sont requis.")
                else if (data?.error === "INVALID_PSEUDO") setError("Pseudo trop court.")
                else if (data?.error === "WEAK_PASSWORD") setError("Mot de passe trop court (min. 8).")
                else if (data?.error === "SEND_FAILED") setError("L'email n'a pas pu être envoyé. Réessaie.")
                else setError("Une erreur est survenue. Réessaie.")
        } else {
        setOk(true)
        if (data?.resent) {
            // tu peux ajuster le message “on a renvoyé l’email”
        }
        if (data?.devVerifyUrl) {
            console.log("[DEV] Lien de vérif:", data.devVerifyUrl)
        }
        }

    } catch {
      setError("Impossible de contacter le serveur.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[70dvh] grid place-items-center px-4">
      <div className="card w-full max-w-md bg-dark-100 border border-base-300 shadow-xl rounded-2xl">
        <div className="card-body p-5">
          <h2 className="card-title text-2xl">Inscription</h2>
          <p className="text-sm opacity-70 text-center">Entre tes identifiants ci-dessous.</p>

          {ok && (
            <div className="alert alert-success mt-3">
              <span>Compte créé ! Vérifie tes emails pour l’activer ✅</span>
            </div>
          )}
          {error && (
            <div className="alert alert-error mt-3">
              <span>{error}</span>
            </div>
          )}

          <form className="mt-4 space-y-4" onSubmit={onSubmit} noValidate>
            <div className="form-control">
              <label className="label"><span className="label-text">Pseudo</span></label>
              <input
                type="text"
                className="input input-bordered w-full rounded px-2 py-1 red"
                value={pseudo}
                onChange={(e)=>setPseudo(e.target.value)}
                required
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Email</span></label>
              <input
                type="email"
                className="input input-bordered w-full rounded px-2 py-1"
                value={email}
                onChange={(e)=>setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Mot de passe</span></label>
              <input
                type="password"
                className="input input-bordered w-full rounded px-2 py-1"
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
                required
              />
            </div>
            <button className="btn btn-primary w-full rounded-xl" disabled={loading}>
              {loading ? "Création..." : "S'inscrire"}
            </button>
          </form>

          <div className="text-sm text-center mt-2">
            <a href="/login" className="link link-primary">Déjà un compte ?</a>
          </div>
        </div>
      </div>
    </div>
  )
}
