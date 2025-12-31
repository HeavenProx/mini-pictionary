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

  // ------- vérifier que la room existe et si je suis l'host -------
  const [started, setStarted] = useState(false)
  const [isHost, setIsHost] = useState(false)
  const [startError, setStartError] = useState("")
  const [actionError, setActionError] = useState("")

  useEffect(() => {
    let abort = false
    ;(async () => {
      const res = await fetch(`/api/rooms/${roomId}`)
      const data = await res.json().catch(() => ({}))
      if (abort) return
      setExists(res.ok)
      if (!res.ok) setTimeout(() => router.replace("/rooms/join"), 1500)
      else {
        setIsHost(Boolean(data.hostId && data.hostId === me.id))
        if (data?.started) {
          setStarted(true)
          // si la DB dit que je suis le drawer, assure mon rôle
          if (data?.drawerId && data.drawerId === me.id) {
            setRole("drawer")
          }
          // stocker l'identité persistante du dessinateur pour éviter les écrasements
          if (data?.drawerId) setDrawerUserId(data.drawerId)
          if (data?.drawerSocketId) setDrawerSocketId(data.drawerSocketId)
        }
      }
    })()
    return () => { abort = true }
  }, [roomId, router, me.id])

  // écoute l'état de la room (started) côté socket
  const [role, setRole] = useState(null) // 'drawer' | 'guesser'
  const [drawerName, setDrawerName] = useState(null)
  const [drawerUserId, setDrawerUserId] = useState(null)
  const [drawerSocketId, setDrawerSocketId] = useState(null)
  const [secretWord, setSecretWord] = useState(null)
  const pendingRoleRef = useRef(null)

  useEffect(() => {
    if (!roomId) return
    const socket = getSocket()
    const onState = ({ started }) => {
      console.log("[client] room:state received", { started })
      setStarted(Boolean(started))
      // cleanup local prompt/roles when game stops
      if (!started) {
        setRole(null)
        setDrawerName(null)
        setDrawerUserId(null)
        setDrawerSocketId(null)
        setSecretWord(null)
        if (pendingRoleRef.current) {
          clearTimeout(pendingRoleRef.current)
          pendingRoleRef.current = null
        }
      }
    }
    const onGameStarted = ({ started }) => {
      console.log("[client] game:started received", { started })
      setStarted(Boolean(started))
    }
    const onStartDenied = ({ reason }) => {
      console.log("[client] game:start:denied received", { reason })
      setStartError(reason || "START_DENIED")
    }
    const onStartOk = ({ roomId, drawerSid, drawerName, drawerUserId, drawerSocketId }) => {
      console.log("[client] game:start:ok received", { roomId, drawerSid, drawerName, drawerUserId, drawerSocketId })
      // server confirmed persistence — nothing to do here (roles will arrive via game:role), but clear errors
      setStartError("")
    }
    const onRole = ({ role: incomingRole, drawerName: incomingDrawerName, drawerUserId: payloadDrawerUserId, drawerSocketId: payloadDrawerSocketId }) => {
      console.log("[client] game:role received", { incomingRole, incomingDrawerName, payloadDrawerUserId, payloadDrawerSocketId })
      const socket = getSocket()
      const payloadAuthoritative = Boolean(payloadDrawerUserId || payloadDrawerSocketId)

      // If payload is authoritative, apply immediately and clear any pending non-authoritative change
      if (payloadAuthoritative) {
        if (pendingRoleRef.current) {
          clearTimeout(pendingRoleRef.current)
          pendingRoleRef.current = null
        }
        if ((payloadDrawerUserId && payloadDrawerUserId === me.id) || (payloadDrawerSocketId && socket.id && payloadDrawerSocketId === socket.id)) {
          setRole("drawer")
        } else {
          setRole("guesser")
        }
      } else {
        // Non-authoritative -> schedule a short delay so authoritative info (from fetch/game:roles) can arrive
        if (pendingRoleRef.current) clearTimeout(pendingRoleRef.current)
        pendingRoleRef.current = setTimeout(() => {
          // if local authoritative identity exists, respect it
          if (drawerUserId && drawerUserId === me.id) {
            setRole((p) => p || "drawer")
          } else if (drawerSocketId && socket.id && drawerSocketId === socket.id) {
            setRole((p) => p || "drawer")
          } else {
            setRole(incomingRole)
          }
          pendingRoleRef.current = null
        }, 150)
      }

      setActionError("")
      if (incomingDrawerName) setDrawerName(incomingDrawerName)
    }
    const onRoles = ({ drawerSid, drawerName, drawerUserId: newDrawerUserId, drawerSocketId: newDrawerSocketId }) => {
      console.log("[client] game:roles received", { drawerSid, drawerName, newDrawerUserId, newDrawerSocketId })
      setDrawerName(drawerName || null)
      // clear any pending non-authoritative update
      if (pendingRoleRef.current) {
        clearTimeout(pendingRoleRef.current)
        pendingRoleRef.current = null
      }
      // stocker l'identité persistée du dessinateur
      setDrawerUserId(newDrawerUserId || null)
      setDrawerSocketId(newDrawerSocketId || null)
      const socket = getSocket()
      // si le drawerUserId correspond à moi, assure mon rôle
      if (newDrawerUserId && newDrawerUserId === me.id) {
        setRole("drawer")
      } else if (newDrawerSocketId && socket.id && newDrawerSocketId === socket.id) {
        // fallback : si le drawer était anonyme et son socket correspond au mien
        setRole("drawer")
      } else {
        // sinon, assurez-vous que les joueurs voient le rôle 'guesser' (sans écraser un dessinateur local)
        setRole((prev) => (prev === "drawer" ? "drawer" : "guesser"))
      }
    }

    socket.on("room:state", onState)
    socket.on("game:started", onGameStarted)
    socket.on("game:start:denied", onStartDenied)
    socket.on("game:start:ok", onStartOk)
    socket.on("game:role", onRole)
    socket.on("game:roles", onRoles)

    const onChatDenied = ({ reason }) => {
      console.log("[client] chat:denied", { reason })
      setActionError(reason || "CHAT_DENIED")
    }
    const onDrawDenied = ({ reason }) => {
      console.log("[client] draw:denied", { reason })
      setActionError(reason || "DRAW_DENIED")
    }
    const onWord = ({ word, wordId }) => {
      console.log('[client] game:word received', { wordId })
      setSecretWord(word)
    }

    socket.on("chat:denied", onChatDenied)
    socket.on("draw:denied", onDrawDenied)
    socket.on("game:word", onWord)

    return () => {
      if (pendingRoleRef.current) {
        clearTimeout(pendingRoleRef.current)
        pendingRoleRef.current = null
      }

      socket.off("room:state", onState)
      socket.off("game:started", onGameStarted)
      socket.off("game:start:denied", onStartDenied)
      socket.off("game:role", onRole)
      socket.off("game:roles", onRoles)
      socket.off("chat:denied", onChatDenied)
      socket.off("draw:denied", onDrawDenied)
      socket.off("game:word", onWord)
    }
  }, [roomId])

  // clear secret word when role changes or game stops
  useEffect(() => {
    if (role !== 'drawer') setSecretWord(null)
  }, [role, started])

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
    // only guessers can send chat
    if (role === "drawer") {
      setStartError("Seul un devinateur peut écrire dans le chat")
      return
    }

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
    // only drawer can start drawing
    if (role !== "drawer") return
    e.preventDefault()
    const p = getPos(e)
    lastRef.current = p
    setIsDrawing(true)
  }
  const draw = (e) => {
    if (!isDrawing) return
    // only drawer can draw
    if (role !== "drawer") return
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

  const startGame = () => {
    console.log("[client] game:start emit", { roomId })
    getSocket().emit("game:start", { roomId })
    setStarted(true)
  }

  if (exists === false) {
    return (
      <div className="min-h-[60dvh] grid place-items-center">
        <p>Room introuvable… redirection…</p>
      </div>
    )
  }

  // page d'attente (avant démarrage de la partie)
  if (exists && !started) {
    return (
      <div className="min-h-[70dvh] grid place-items-center px-4">
        <div className="w-full max-w-lg rounded-2xl border border-neutral-300 dark:border-neutral-700 p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">En attente — Room</h1>
            <Link href="/" className="text-sm underline">← Retour</Link>
          </div>

          <p className="mt-3 text-sm opacity-80">Code de la room : <span className="font-mono text-green-600">{roomId}</span></p>

          <div className="my-5">
              <p className="text-medium">Lorsque la partie commence, un rôle vous est automatiquement attribué. Vous devenez un des deux : </p>
              <ul className="mt-2 space-y-1">
                <li className="text-sm"><span className="font-semibold text-blue-600">Dessinateur</span> : il doit faire deviner son mot secret en dessinant</li>
                <li className="text-sm"><span className="font-semibold text-red-600">Devineur</span> : il doit deviner le mot secret du dessinateur en écrivant dans le chat</li>
              </ul>
          </div>

          <div className="mt-4">
            <h3 className="font-medium">Joueurs : {participants.length}</h3>
            <ul className="mt-2 space-y-1">
              {participants.map((p) => (
                <li key={p.id} className="text-sm">{p.name}</li>
              ))}
            </ul>
          </div>

          <div className="mt-6">
            {isHost ? (
              <div>
                <button onClick={startGame} className="px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition">
                  Lancer la partie
                </button>
                {startError && (
                  <p className="text-sm text-red-500 mt-2">Erreur: {startError}</p>
                )}
              </div>
            ) : (
              <p className="text-sm opacity-80">En attente du lanceur de la partie…</p>
            )}
          </div>
        </div>
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
                onClick={() => role === "drawer" && setColor(c)}
                className={`h-10 w-10 rounded-full ring-4 transition border border-neutral-300 dark:border-neutral-700 ${color === c ? "ring-indigo-500" : "ring-transparent"} ${started && role !== "drawer" ? "opacity-40 pointer-events-none" : ""}`}
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
              <div className="flex items-center gap-3">
                {started && role && (
                  <span className={`text-sm font-medium ${role === "drawer" ? "text-blue-600" : "text-red-600"}`}>
                    {role === "drawer" ? "Dessinateur" : "Devinateur"}
                    {role === "drawer" && drawerName ? ` — ${drawerName}` : ""}
                  </span>
                )}
                <Link href="/" className="text-sm underline">Quitter</Link>
              </div>
            </div>

            <div
              ref={containerRef}
              className="mt-4 relative w-full h-[420px] md:h-[540px] rounded-lg
               bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 overflow-hidden"
            >
              <canvas
                ref={canvasRef}
                className={`absolute inset-0 cursor-crosshair touch-none ${started && role !== "drawer" ? "pointer-events-none opacity-60" : ""}`}
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
            {role === 'drawer' && (
              <div className="mb-2">
                <div className="text-sm font-medium text-blue-600">Mot secret :</div>
                <div className="mt-1 inline-block rounded-md bg-neutral-900 text-white px-3 py-2">{secretWord || 'Chargement…'}</div>
              </div>
            )}
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
            {actionError && (
              <div className="p-3">
                <p className="text-sm text-red-500">{actionError}</p>
              </div>
            )}
            <form
              onSubmit={(e) => { e.preventDefault(); sendChat(); }}
              className="border-t border-neutral-300 dark:border-neutral-700 p-3 flex gap-2"
            >
              <input
                type="text"
                placeholder={role === "drawer" ? "Tu es le dessinateur — tu ne peux pas écrire" : "Ton message…"}
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700
                            bg-white dark:bg-neutral-900 px-3 py-2 outline-none
                            focus:ring-2 focus:ring-violet-500/60"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={role === "drawer"}
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
            Code de la room : <span className="font-mono">{roomId}</span>
          </p>
        </aside>
      </div>
    </div>
  )
}
