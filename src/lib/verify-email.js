// src/lib/verify-email.js
export function renderVerifyEmail({ pseudo = "", verifyUrl }) {
  const safeName = pseudo ? `Salut ${pseudo},` : "Salut,"
  const subject = "Vérifie ton adresse email"

  const text = `${safeName}
Clique sur le lien pour vérifier ton email :
${verifyUrl}

Ce lien expire dans 24 heures.`

  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b0b0b">
    <p>${safeName}</p>
    <p>Clique sur le bouton ci-dessous pour vérifier ton adresse email.</p>
    <p style="margin:24px 0">
      <a href="${verifyUrl}"
         style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none">
        Vérifier mon email
      </a>
    </p>
    <p>Ou copie-colle ce lien :</p>
    <p style="word-break:break-all"><a href="${verifyUrl}">${verifyUrl}</a></p>
    <p style="color:#6b7280">Ce lien expire dans 24 heures.</p>
  </div>`

  return { subject, text, html }
}
