// src/app/rooms/[id]/page.js
"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { useRoomSocket } from "@/hooks/useRoomSocket"
import { getSocket } from "@/lib/socket-client"

const COLORS = [
  "#000000", "#EF4444", "#F59E0B", "#FBBF24", "#22C55E",
  "#10B981", "#3B82F6", "#6366F1", "#A855F7", "#8E8E93",
]

export default function RoomPage() {
  const { id: roomId } = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const me = { id: session?.user?.id, name: session?.user?.name || "Anonyme" }

  // ---- présence temps réel (participants) ----
  const [exists, setExists] = useState(null)
  const { participants } = useRoomSocket(roomId, me)

  // ---- canvas refs & state ----
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [color, setColor] = useState(COLORS[0])
  const [isDrawing, setIsDrawing] = useState(false)
  const lastRef = useRef({ x: 0, y: 0 }) // évite re-render
  const lineWidth = 4

  // ---- chat ----
  const chatViewportRef = useRef(null)
  const [messages, setMessages] = useState([
    { id: 1, author: "Système", text: "Bienvenue dans la room 👋" },
  ])
  const [chatInput, setChatInput] = useState("")

  // ------- vérifier que la room existe -------
  useEffect(() => {
    let abort = false
    ;(async () => {
      const res = await fetch(`/api/rooms/${roomId}`)
      if (abort) return
      setExists(res.ok)
      if (!res.ok) setTimeout(() => router.replace("/rooms/join"), 1500)
    })()
    return () => { abort = true }
  }, [roomId, router])

  // ------- Canvas: resize DPR -------
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
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener("resize", resize)
    return () => window.removeEventListener("resize", resize)
  }, [])

  // helpers
  const getPos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const t = e.touches?.[0]
    const clientX = t ? t.clientX : e.clientX
    const clientY = t ? t.clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }
  const drawSegment = useCallback((ctx, from, to, stroke, width) => {
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = stroke
    ctx.lineWidth = width
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
  }, [])

  // ------- LISTEN: chat + draw (un seul effet, connexion garantie) -------
  useEffect(() => {
    if (!roomId) return
    const socket = getSocket()

    if (!socket.connected) {
      socket.connect()
    }

    const onConnect = () => console.log("[client] socket connected", socket.id)
    const onDisconnect = () => console.log("[client] socket disconnected")

    const onChat = (msg) => {
      console.log("[client] chat:message received", msg)
      setMessages((m) => [...m, msg])
    }

    const onDraw = ({ from, to, color: c, width }) => {
      // console.log("[client] draw:segment received")
      const ctx = canvasRef.current?.getContext("2d")
      if (!ctx) return
      drawSegment(ctx, from, to, c, width)
    }

    socket.on("connect", onConnect)
    socket.on("disconnect", onDisconnect)
    socket.on("chat:message", onChat)
    socket.on("draw:segment", onDraw)

    // cleanup propre (avant de changer de room / démonter)
    return () => {
      socket.off("connect", onConnect)
      socket.off("disconnect", onDisconnect)
      socket.off("chat:message", onChat)
      socket.off("draw:segment", onDraw)
    }
  }, [roomId, drawSegment])

  // ------- Chat: auto-scroll -------
  useEffect(() => {
    const el = chatViewportRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  // ------- Chat: send -------
  const sendChat = () => {
    const text = chatInput.trim()
    if (!text) return

    // append optimiste
    const local = { id: Date.now(), author: me.name || "Moi", text }
    setMessages((m) => [...m, local])

    console.log("[client] chat:message emit", { roomId, text })
    getSocket().emit("chat:message", { roomId, text, user: me })
    setChatInput("")
  }

  // ------- Canvas: interactions (local + emit) -------
  const startDraw = (e) => {
    e.preventDefault()
    const p = getPos(e)
    lastRef.current = p
    setIsDrawing(true)
  }
  const draw = (e) => {
    if (!isDrawing) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    const p = getPos(e)
    const from = lastRef.current
    const to = p

    // local
    drawSegment(ctx, from, to, color, lineWidth)

    // emit
    getSocket().emit("draw:segment", { roomId, from, to, color, width: lineWidth })
    lastRef.current = p
  }
  const endDraw = () => setIsDrawing(false)


  if (exists === false) {
    return (
      <div className="min-h-[60dvh] grid place-items-center">
        <p>Room introuvable… redirection…</p>
      </div>
    )
  }

  return (
    <div className="min-h-[70dvh] px-4 py-6">
      <div className="mx-auto max-w-6xl grid gap-4 lg:grid-cols-[56px_minmax(0,1fr)_360px] items-start">
        {/* PALETTE */}
        <aside className="order-1 lg:order-none">
          <div className="sticky top-20 lg:top-6 flex lg:flex-col gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                aria-label={`Couleur ${c}`}
                onClick={() => setColor(c)}
                className={`h-10 w-10 rounded-full ring-4 transition border border-neutral-300 dark:border-neutral-700 ${color === c ? "ring-indigo-500" : "ring-transparent"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </aside>

        {/* CANVAS */}
        <section className="order-3 lg:order-none">
          <div className="rounded-xl border border-neutral-300 dark:border-neutral-700 p-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold">Room {String(roomId).slice(0, 8)}…</h1>
              <Link href="/" className="text-sm underline">Quitter</Link>
            </div>

            <div
              ref={containerRef}
              className="mt-4 relative w-full h-[420px] md:h-[540px] rounded-lg
               bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 overflow-hidden"
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

            {/* mot secret (juste UI pour l’instant) */}
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Ton mot secret…"
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500/60"
              />
              <button className="rounded-lg px-4 py-2 bg-violet-600 text-white hover:bg-violet-500 transition">
                Valider
              </button>
            </div>
          </div>
        </section>

        {/* CHAT + compteur joueurs */}
        <aside className="order-2 lg:order-none min-h-0">
          <div className="rounded-xl border border-neutral-300 dark:border-neutral-700
                          flex flex-col h-[420px] md:h-[540px] overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-neutral-300 dark:border-neutral-700
                            flex items-center justify-between">
              <h2 className="text-lg font-semibold">Chat</h2>
              <span className="text-sm opacity-80">
                Joueurs connectés : <strong>{participants.length}</strong>
              </span>
            </div>
            {/* Messages */}
            <div ref={chatViewportRef}
                  className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
              {messages.map((m) => (
                <div key={m.id} className="text-sm">
                  <span className="font-semibold">{m.author}:</span>{" "}
                  <span>{m.text}</span>
                </div>
              ))}
            </div>
            {/* Input */}
            <form
              onSubmit={(e) => { e.preventDefault(); sendChat(); }}
              className="border-t border-neutral-300 dark:border-neutral-700 p-3 flex gap-2"
            >
              <input
                type="text"
                placeholder="Ton message…"
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700
                            bg-white dark:bg-neutral-900 px-3 py-2 outline-none
                            focus:ring-2 focus:ring-violet-500/60"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button
                type="submit"
                className="rounded-lg px-4 py-2 border border-neutral-300 dark:border-neutral-700
                            hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              >
                Envoyer
              </button>
            </form>
          </div>
          <p className="text-xs opacity-70 mt-2">
            Connexion temps réel via Socket.IO — room <span className="font-mono">#{roomId}</span>.
          </p>
        </aside>
      </div>
    </div>
  )
}
