"use client"
import { useEffect, useRef, useState } from "react"

const COLORS = [
  "#000000", "#EF4444", "#F59E0B", "#FBBF24", "#22C55E",
  "#10B981", "#3B82F6", "#6366F1", "#A855F7", "#8E8E93",
]

export default function PlayDraw() {
  // Constante des différents états
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const chatViewportRef = useRef(null)
  const [color, setColor] = useState(COLORS[0])
  const [isDrawing, setIsDrawing] = useState(false)
  const [last, setLast] = useState({ x: 0, y: 0 })
  const [word, setWord] = useState("")
  const [wordLocked, setWordLocked] = useState(false)

  // chat (local/demo)
  const [messages, setMessages] = useState([
    { id: 1, author: "Système", text: "Bienvenue dans la room 👋" },
  ])
  const [chatInput, setChatInput] = useState("")

  // Resize le canvas comme un container 
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current
      const wrap = containerRef.current
      if (!canvas || !wrap) return
      const dpr = Math.max(1, window.devicePixelRatio || 1)
      const cssW = wrap.clientWidth
      const cssH = wrap.clientHeight
      canvas.width = Math.floor(cssW * dpr)
      canvas.height = Math.floor(cssH * dpr)
      canvas.style.width = cssW + "px"
      canvas.style.height = cssH + "px"
      const ctx = canvas.getContext("2d")
      // Scale : 1 unité de dessin = 1 unité de mesure
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener("resize", resize)
    return () => window.removeEventListener("resize", resize)
  }, [])

  // Récupérer la position du pointeur
  const getPos = (e) => {
    const canvas = canvasRef.current
    // Convertie les données dites viewport en coordonnées relatiove au canvas
    const rect = canvas.getBoundingClientRect()
    const isTouch = e.touches && e.touches[0]
    const clientX = isTouch ? e.touches[0].clientX : e.clientX
    const clientY = isTouch ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  // Mode dessin, mémorise le point de départ
  const startDraw = (e) => {
    e.preventDefault()
    const p = getPos(e)
    setIsDrawing(true)
    setLast(p)
  }

  // Dessine
  const draw = (e) => {
    if (!isDrawing) return
    e.preventDefault()
    // Récupère les données essentielles : context, type de trait, couleur...
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    const p = getPos(e)
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = color
    ctx.lineWidth = 4

    // Fais le trait
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    setLast(p)
  }

  // Stop le dessin
  const endDraw = () => setIsDrawing(false)

  const validateWord = () => {
    if (!word.trim()) return
    setWordLocked(true)
  }

  const sendChat = () => {
    const txt = chatInput.trim()
    if (!txt) return
    setMessages((m) => [...m, { id: Date.now(), author: "Moi", text: txt }])
    setChatInput("")
  }

  useEffect(() => {
    const el = chatViewportRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight 
  }, [messages])


  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-center pb-3">
        Inscris ton mot, valide, puis dessine-le pour que les autres le devine !
      </p>

      <div className="grid gap-4 lg:grid-cols-[56px_minmax(0,1fr)_360px]">
        {/* PALETTE (gauche) */}
        <aside className="order-1 lg:order-none">
          <div className="sticky top-20 lg:top-6 flex lg:flex-col gap-2">
            {/* Map les couleurs */}
            {COLORS.map((c) => (
              <button key={c} aria-label={`Couleur ${c}`} onClick={() => setColor(c)}
                className={`h-10 w-10 rounded-full ring-4 transition
                            ${color === c ? "ring-indigo-500" : "ring-transparent"}
                            border border-base-300`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </aside>

        {/* CANVAS (centre) */}
        <section className="order-3 lg:order-none">
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <div
                ref={containerRef}
                className="relative w-full h-[420px] md:h-[540px] rounded-lg
                           bg-base-200 border border-base-300 overflow-hidden
                           bg-gray-100 opacity-90"
              >
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 cursor-crosshair touch-none"
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={endDraw}
                />
              </div>

              {/* Mot secret */}
              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Ton mot secret…"
                  className="input input-bordered w-full"
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  disabled={wordLocked}
                />
                {wordLocked ? (
                  <span className="badge badge-success self-center">Validé</span>
                ) : (
                  <button onClick={validateWord} className="btn btn-primary">
                    Valider
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* CHAT (droite) */}
        <aside className="order-2 lg:order-none min-h-0">
          <div className="card bg-base-100 h-[420px] md:h-[540px] shadow">
            {/* 1) h-full pour que la body prenne toute la hauteur de la card */}
            {/* 2) On force un flux flex vertical ici */}
            <div className="card-body p-0 h-full flex">
              {/* 3) Ce wrapper prend toute la hauteur et autorise la réduction */}
              <div className="flex flex-col w-full h-full min-h-0">
                <div className="p-3 border-b border-base-300">
                  <h3 className="font-semibold">Chat</h3>
                </div>

                {/* 4) La zone messages grandit (flex-1) et peut scroller */}
                <div ref={chatViewportRef} className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
                  {messages.map((m) => (
                    <div key={m.id} className="text-sm">
                      <span className="font-semibold">{m.author}:</span>{" "}
                      <span>{m.text}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-base-300 p-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ton message…"
                      className="input input-bordered w-full px-2 py-1"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendChat()}
                    />
                    <button className="btn" onClick={sendChat}>Envoyer</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

      </div>
    </div>
  )
}
