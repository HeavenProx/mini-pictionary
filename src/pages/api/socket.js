import { Server } from "socket.io"
import prisma from "@/lib/prisma"

export const config = { api: { bodyParser: false } }

export default function handler(req, res) {
  // évite de recréer le serveur à chaud
  if (res.socket.server.io) {
    res.end()
    return
  }

  const io = new Server(res.socket.server, {
    path: "/api/socket",
    cors: { origin: "*" },
  })
  res.socket.server.io = io
  console.log("[io] server started")

  // petit registre éphémère des rooms → participants
  const rooms = new Map() // Map<roomId, Map<socketId, {id,name}>>
  const roomStates = new Map() // Map<roomId, { started: boolean }>
  // timers pour suppression différée lors d'un disconnect (tolérance au reload)
  const disconnectTimers = new Map() // Map<socketId, Timeout>

  // helper: démarre le compte à rebours de fin de manche pour une room
  function startRoundEndCountdown(roomId) {
    const state = roomStates.get(roomId)
    if (!state) return
    if (state.roundTimer && state.roundTimer.interval) return // déjà démarré

    state.roundTimer = { remaining: 30, interval: null }
    io.to(roomId).emit('game:timer', { remaining: state.roundTimer.remaining })
    console.log('[io] started round end countdown', { roomId, remaining: state.roundTimer.remaining })

    state.roundTimer.interval = setInterval(() => {
      state.roundTimer.remaining -= 1
      io.to(roomId).emit('game:timer', { remaining: state.roundTimer.remaining })

      // si le timer arrive à zéro, on termine la manche
      if (state.roundTimer.remaining <= 0) {
        console.log('[io] round timer expired, ending round', { roomId })
        endRound(roomId)
      }

      // si tous les devinateurs ont déjà trouvé, on termine aussi
      const participantsMap = rooms.get(roomId) || new Map()
      const guesserCount = Math.max(0, participantsMap.size - (state.drawerSid ? 1 : 0))
      const foundCount = (state.currentFound || []).length
      if (foundCount >= guesserCount && guesserCount > 0) {
        endRound(roomId)
      }
    }, 1000)

    roomStates.set(roomId, state)
  }

  // démarre une nouvelle manche (choisit dessinateur + mot + persiste)
  async function startNewRound(roomId) {
    try {
      const participantsMap = rooms.get(roomId) || new Map()
      const sids = Array.from(participantsMap.keys())
      if (!sids.length) return

      // choisit un nouveau dessinateur aléatoire
      const drawerSid = sids[Math.floor(Math.random() * sids.length)]
      const drawerName = participantsMap.get(drawerSid)?.name || null

      // si le participant choisi possède un userId, on le persiste comme drawerId
      let drawerUserId = null
      const candidate = drawerSid ? participantsMap.get(drawerSid)?.id : null
      if (candidate) {
        const user = await prisma.user.findUnique({ where: { id: candidate } }).catch(() => null)
        if (user) drawerUserId = user.id
      }
      const drawerSocketId = drawerSid || null

      // pick prompt
      let selectedPrompt = null
      const count = await prisma.prompt.count()
      if (count > 0) {
        const skip = Math.floor(Math.random() * count)
        const p = await prisma.prompt.findMany({ take: 1, skip })
        selectedPrompt = p[0] || null
      }

      // Persister l'état en DB
      try {
        await prisma.room.update({ where: { id: roomId }, data: { started: true, drawerId: drawerUserId, drawerSocketId, currentWordId: selectedPrompt ? selectedPrompt.id : null } })
      } catch (e) {
        console.error('[io] failed to persist new round state', { roomId, e })
      }

      // Met à jour l'état en mémoire
      roomStates.set(roomId, { started: true, drawerSid, drawerName, drawerUserId, drawerSocketId, currentWordId: selectedPrompt ? selectedPrompt.id : null, currentWordText: selectedPrompt ? selectedPrompt.text : null, currentFound: [], roundTimer: null, replayers: new Set() })

      // broadcast: reset client UI (vider chat, effacer canvas, fermer modals)
      io.to(roomId).emit('game:reset')

      // broadcast state + event
      io.to(roomId).emit('room:state', { started: true })
      io.to(roomId).emit('game:started', { started: true })

      // envoie le rôle *seulement* au dessinateur (authoritatif)
      if (drawerSid) {
        io.to(drawerSid).emit('game:role', { role: 'drawer', drawerName, drawerUserId, drawerSocketId })
      }

      // broadcast info sur qui est le dessinateur pour l'UI
      io.to(roomId).emit('game:roles', { drawerSid, drawerName, drawerUserId, drawerSocketId })

      // envoie le mot secret QUE AU DESSINATEUR
      if (drawerSid && selectedPrompt) {
        io.to(drawerSid).emit('game:word', { word: selectedPrompt.text, wordId: selectedPrompt.id })
        console.log('[io] sent secret word to drawer (auto-start)', { roomId, drawerSid, wordId: selectedPrompt.id })
      }

    } catch (e) {
      console.error('[io] startNewRound error', { roomId, e })
    }
  }

  async function endRound(roomId) {
    const state = roomStates.get(roomId)
    if (!state) return

    // stop timer si présent
    if (state.roundTimer && state.roundTimer.interval) {
      clearInterval(state.roundTimer.interval)
    }

    const winners = (state.currentFound || []).map((f) => ({ username: f.username, userId: f.userId }))

    // broadcast end of the round
    io.to(roomId).emit('game:timer', { remaining: 0 })
    io.to(roomId).emit('game:ended', { winners })

    // marque la room comme fermée (started = false) et nettoie le mot / dessinateur
    try {
      await prisma.room.update({ where: { id: roomId }, data: { started: false, drawerId: null, drawerSocketId: null, currentWordId: null } })
    } catch (e) {
      console.error('[io] failed to persist room closed state', { roomId, e })
    }

    // broadcast state closed
    io.to(roomId).emit('room:state', { started: false })

    // cleanup round-specific state
    state.currentFound = []
    state.roundTimer = null
    state.replayers = state.replayers || new Set()
    state.started = false
    state.drawerSid = null
    state.drawerName = null
    state.drawerUserId = null
    state.drawerSocketId = null
    state.currentWordId = null
    state.currentWordText = null
    roomStates.set(roomId, state)
  }

  io.on("connection", (socket) => {
    console.log("[io] connection", socket.id)

    // ------- JOIN avec ACK -------
    socket.on("room:join", async ({ roomId, user }, ack) => {
      if (!roomId) return ack?.({ ok: false, error: "NO_ROOM" })
      socket.join(roomId)
      socket.data.roomId = roomId // on mémorise la room du socket

      if (!rooms.has(roomId)) rooms.set(roomId, new Map())

      // Si un participant avec le même user.id existait (reload/reconnect),
      // nettoie l'ancienne entrée pour éviter leave/join oscillants.
      try {
        if (user?.id) {
          for (const [sid, info] of Array.from(rooms.get(roomId).entries())) {
            if (info && info.id && String(info.id) === String(user.id) && sid !== socket.id) {
              // annule timer de suppression si présent
              const t = disconnectTimers.get(sid)
              if (t) {
                clearTimeout(t)
                disconnectTimers.delete(sid)
              }
              rooms.get(roomId).delete(sid)
              console.log('[io] removed stale participant on reconnect', { roomId, oldSid: sid, userId: user.id })
            }
          }
        }
      } catch (e) {
        console.error('[io] error cleaning stale participants', { roomId, e })
      }

      rooms.get(roomId).set(socket.id, {
        id: user?.id || socket.id,
        name: user?.name || "Anonyme",
      })

      const list = Array.from(rooms.get(roomId).values())
      io.to(roomId).emit("room:participants", list)

      // envoie l'état courant de la room au nouveau connecté (préférence mémoire)
      let state = roomStates.get(roomId)

      // si pas d'état en mémoire, vérifier DB pour récupérer started/drawerId
      if (!state) {
        try {
          const roomRec = await prisma.room.findUnique({ where: { id: roomId }, select: { started: true, drawerId: true, drawerSocketId: true } })
          if (roomRec?.started) {
            // essayer de retrouver le socket id du drawer si drawerId correspond à un user id
            const participantsMap = rooms.get(roomId) || new Map()
            let drawerSid = null
            let drawerName = null

            if (roomRec.drawerId) {
              for (const [sid, info] of participantsMap.entries()) {
                if (info.id && info.id === roomRec.drawerId) {
                  drawerSid = sid
                  drawerName = info.name
                  break
                }
              }
            }

            // fallback: si drawerSocketId est présent, regarde si le socket est connecté
            if (!drawerSid && roomRec.drawerSocketId && participantsMap.has(roomRec.drawerSocketId)) {
              drawerSid = roomRec.drawerSocketId
              drawerName = participantsMap.get(drawerSid)?.name || null
            }

            state = { started: true, drawerSid, drawerName, drawerUserId: roomRec.drawerId, drawerSocketId: roomRec.drawerSocketId, currentWordId: roomRec.currentWordId }
            roomStates.set(roomId, state)

            // envoyer le rôle *seulement* au dessinateur (authoritatif), et broadcast l'identité du dessinateur à tous
            const sids = Array.from(participantsMap.keys())
            if (drawerSid) {
              io.to(drawerSid).emit("game:role", { role: "drawer", drawerName, drawerUserId: roomRec.drawerId, drawerSocketId: roomRec.drawerSocketId })
            }
            io.to(roomId).emit("game:roles", { drawerSid, drawerName, drawerUserId: roomRec.drawerId, drawerSocketId: roomRec.drawerSocketId })

            // si un mot était déjà choisi, récupérer le texte et l'envoyer au dessinateur
            if (roomRec.currentWordId) {
              try {
                const prompt = await prisma.prompt.findUnique({ where: { id: roomRec.currentWordId } })
                if (prompt && drawerSid) {
                  io.to(drawerSid).emit('game:word', { word: prompt.text, wordId: prompt.id })
                  console.log('[io] re-sent secret word to drawer on join', { roomId, drawerSid, wordId: prompt.id })
                }
              } catch (e) {
                console.error('[io] failed to fetch prompt on join', { roomId, e })
              }
            }
          }
        } catch (e) {
          console.error("[io] failed to sync room state from DB on join", { roomId, e })
        }
      }

      // If the room has already started and this joining user is the persisted drawer user,
      // rebind the drawer to this socket and persist the drawerSocketId so reconnections are authoritative.
      if (state?.started && user?.id && state.drawerUserId && state.drawerUserId === user.id) {
        state.drawerSid = socket.id
        state.drawerSocketId = socket.id
        roomStates.set(roomId, state)
        try {
          await prisma.room.update({ where: { id: roomId }, data: { drawerSocketId: socket.id } })
          console.log('[io] updated drawerSocketId on reconnect', { roomId, drawerUserId: state.drawerUserId, drawerSocketId: socket.id })
        } catch (e) {
          console.error('[io] failed to persist drawerSocketId on reconnect', { roomId, e })
        }

        // broadcast authoritative roles and re-send current word if any
        io.to(roomId).emit('game:roles', { drawerSid: state.drawerSid, drawerName: state.drawerName, drawerUserId: state.drawerUserId, drawerSocketId: state.drawerSocketId })
        if (state.currentWordId) {
          try {
            const prompt = await prisma.prompt.findUnique({ where: { id: state.currentWordId } })
            if (prompt) {
              io.to(state.drawerSid).emit('game:word', { word: prompt.text, wordId: prompt.id })
              console.log('[io] re-sent secret word to drawer on reconnect', { roomId, drawerSid: state.drawerSid, wordId: prompt.id })
            }
          } catch (e) {
            console.error('[io] failed to fetch prompt on reconnect', { roomId, e })
          }
        }
      }

      socket.emit("room:state", { started: state?.started || false })
      console.log("[io] room:state ->", { to: socket.id, roomId, started: state?.started || false })

      // si la partie est déjà commencée, renvoyer l'information authoritatives au nouveau entrant
      if (state?.started) {
        const drawerSid = state.drawerSid || null
        // toujours fournir l'info globale sur qui est le dessinateur
        socket.emit("game:roles", { drawerSid, drawerName: state.drawerName, drawerUserId: state.drawerUserId, drawerSocketId: state.drawerSocketId })

        // si le socket qui rejoint est le dessinateur, lui renvoyer explicitement son rôle et le mot
        if (socket.id === drawerSid) {
          socket.emit("game:role", { role: "drawer", drawerName: state.drawerName, drawerUserId: state.drawerUserId, drawerSocketId: state.drawerSocketId, word: state.currentWordText || null, wordId: state.currentWordId || null })
          if (state.currentWordText) {
            socket.emit('game:word', { word: state.currentWordText, wordId: state.currentWordId })
          }
        }
      }

      console.log("[io] room:join", { roomId, user: user?.name, sid: socket.id })
      ack?.({ ok: true })
    })

    // ------- LEAVE -------
    socket.on("room:leave", ({ roomId }) => {
      const r = roomId || socket.data.roomId
      if (!r) return
      if (rooms.has(r)) {
        rooms.get(r).delete(socket.id)
        const list = Array.from(rooms.get(r).values())
        io.to(r).emit("room:participants", list)
        // cleanup si plus personne
        if (rooms.get(r).size === 0) {
          rooms.delete(r)
          roomStates.delete(r)
        }
      }
      socket.leave(r)
      socket.data.roomId = undefined
      console.log("[io] room:leave", { roomId: r, sid: socket.id })
    })

    // ------- START GAME (vérifie que l'émetteur est l'host) -------
    socket.on("game:start", async ({ roomId }) => {
      const r = roomId || socket.data.roomId
      if (!r) return

      // qui a envoyé ? (id stocké lors du join)
      const sender = rooms.get(r)?.get(socket.id)?.id

      try {
        const roomRec = await prisma.room.findUnique({ where: { id: r }, select: { hostId: true } })
        const hostId = roomRec?.hostId || null

        if (hostId && hostId !== sender) {
          // pas autorisé → informer celui qui a tenté
          socket.emit("game:start:denied", { reason: "NOT_HOST" })
          console.warn("[io] game:start denied: not host", { roomId: r, by: socket.id, sender, hostId })
          return
        }

        // valide -> mettre à jour l'état et prévenir toute la room
        // choisis un drawer aléatoire parmi les sockets connectés
        const participantsMap = rooms.get(r) || new Map()
        const sids = Array.from(participantsMap.keys())
        const drawerSid = sids.length ? sids[Math.floor(Math.random() * sids.length)] : null
        const drawerName = drawerSid ? participantsMap.get(drawerSid)?.name : null

        // si le participant choisi possède un userId, on le persiste comme drawerId
        let drawerUserId = null
        const candidate = drawerSid ? participantsMap.get(drawerSid)?.id : null
        if (candidate) {
          const user = await prisma.user.findUnique({ where: { id: candidate } }).catch(() => null)
          if (user) drawerUserId = user.id
        }
        const drawerSocketId = drawerSid || null

        // Persister l'état en DB (drawerId si user connu, drawerSocketId en fallback)
        let selectedPrompt = null
        try {
          // pick a random prompt from DB
          const count = await prisma.prompt.count()
          if (count > 0) {
            const skip = Math.floor(Math.random() * count)
            const p = await prisma.prompt.findMany({ take: 1, skip })
            selectedPrompt = p[0] || null
          }

          const updated = await prisma.room.update({ where: { id: r }, data: { started: true, drawerId: drawerUserId, drawerSocketId, currentWordId: selectedPrompt ? selectedPrompt.id : null } })
          console.log("[io] persisted room state:", { roomId: r, started: updated.started, drawerId: updated.drawerId, drawerSocketId: updated.drawerSocketId, currentWordId: updated.currentWordId })
        } catch (e) {
          console.error("[io] failed to persist room state", { roomId: r, e })
        }

        roomStates.set(r, { started: true, drawerSid, drawerName, drawerUserId, drawerSocketId, currentWordId: selectedPrompt ? selectedPrompt.id : null, currentWordText: selectedPrompt ? selectedPrompt.text : null })

        // broadcast: reset client UI (vider chat, effacer canvas, fermer modals)
        io.to(r).emit('game:reset')

        // broadcast state + event
        io.to(r).emit("room:state", { started: true })
        io.to(r).emit("game:started", { started: true })

        // envoie le rôle *seulement* au dessinateur (authoritatif)
        if (drawerSid) {
          io.to(drawerSid).emit("game:role", { role: "drawer", drawerName, drawerUserId, drawerSocketId, word: selectedPrompt ? selectedPrompt.text : null, wordId: selectedPrompt ? selectedPrompt.id : null })          // send the word as well in a dedicated event; keep both for compatibility        }

        // broadcast info sur qui est le dessinateur pour l'UI
        io.to(r).emit("game:roles", { drawerSid, drawerName, drawerUserId, drawerSocketId })

        // envoie le mot secret QUE AU DESSINATEUR (au cas où le client attend séparément)
        if (drawerSid && selectedPrompt) {
          io.to(drawerSid).emit("game:word", { word: selectedPrompt.text, wordId: selectedPrompt.id })
          console.log('[io] sent secret word to drawer', { roomId: r, drawerSid, wordId: selectedPrompt.id })
        }

        // envoie une confirmation à l'initiateur
        socket.emit("game:start:ok", { roomId: r, drawerSid, drawerName, drawerUserId, drawerSocketId })
        // log recipients count for debugging
        const roomSet = io.sockets.adapter.rooms.get(r)
        const recipients = roomSet ? roomSet.size : 0
        console.log("[io] game:start", { roomId: r, by: socket.id, recipients, drawerSid, drawerName, drawerUserId })
        console.log("[io] game:started emitted", { roomId: r, recipients, drawerSid, drawerName, drawerUserId })
      }} catch (err) {
        console.error("[io] game:start error:", err)
        socket.emit("game:start:denied", { reason: "SERVER_ERROR" })
      }
    });

    // ------- CHAT (diffusion à la room) -------
    socket.on("chat:message", async ({ roomId, text, user }) => {
      const r = roomId || socket.data.roomId
      if (!r || !text) return
      // garde-fou: s’assurer que le socket est bien dans la room
      const inRoom = io.sockets.adapter.rooms.get(r)?.has(socket.id)
      if (!inRoom) {
        console.warn("[io] chat refused: not in room", r, socket.id)
        return
      }

      // si la partie est commencée, seul un devinateur peut envoyer des messages
      const state = roomStates.get(r)
      if (state?.started && state.drawerSid === socket.id) {
        socket.emit("chat:denied", { reason: "NOT_ALLOWED_WHILE_DRAWING" })
        console.warn("[io] chat refused: drawer tried to chat", { roomId: r, sid: socket.id })
        return
      }

      // Vérifie si la réponse est correcte (mot secret)
      let foundWord = false
      let currentWord = null
      if (state?.started && state.currentWordId) {
        try {
          const prompt = await prisma.prompt.findUnique({ where: { id: state.currentWordId } })
          if (prompt && prompt.text && text.trim().toLowerCase() === prompt.text.trim().toLowerCase()) {
            foundWord = true
            currentWord = prompt.text
          }
        } catch (e) {
          console.error('[io] erreur vérif mot secret', e)
        }
      }

      if (foundWord) {
        // enregistrer qui a trouvé (empêche les doublons)
        state.currentFound = state.currentFound || []
        const finderId = user?.id || socket.id
        if (!state.currentFound.find((f) => f.userId === finderId || f.socketId === socket.id)) {
          state.currentFound.push({ username: user?.name || 'Anonyme', userId: user?.id || null, socketId: socket.id })
          roomStates.set(r, state)
        }

        // Message spécial à toute la room (vert côté client)
        io.to(r).emit('game:found', { username: user?.name || 'Anonyme', userId: user?.id || null, word: currentWord })

        // démarre le compte à rebours si nécessaire
        startRoundEndCountdown(r)

        return
      }

      const payload = {
        id: Date.now() + Math.random(),
        author: user?.name || "Anonyme",
        text: String(text),
        at: new Date().toISOString(),
      }
      console.log("[io] chat:message", { r, from: payload.author, text: payload.text })
      socket.to(r).emit("chat:message", payload) // <-- exclude sender
    })

    // ------- DESSIN (replay aux autres) -------
    socket.on("draw:segment", ({ roomId, from, to, color = "#000", width = 4 }) => {
      const r = roomId || socket.data.roomId
      if (!r || !from || !to) return
      const inRoom = io.sockets.adapter.rooms.get(r)?.has(socket.id)
      if (!inRoom) return

      // si la partie est commencée, seuls le dessinateur peut envoyer du dessin
      const state = roomStates.get(r)
      if (state?.started && state.drawerSid !== socket.id) {
        socket.emit("draw:denied", { reason: "NOT_ALLOWED" })
        console.warn("[io] draw refused: not drawer", { roomId: r, sid: socket.id })
        return
      }

      // renvoie à tous SAUF l’émetteur (il a déjà dessiné localement)
      socket.to(r).emit("draw:segment", { from, to, color, width })
    })

    socket.on("disconnect", () => {
      const r = socket.data.roomId
      // on attend un peu avant de retirer le participant pour tolérer les reloads
      const timer = setTimeout(() => {
        try {
          if (r && rooms.has(r)) {
            rooms.get(r).delete(socket.id)
            const list = Array.from(rooms.get(r).values())
            io.to(r).emit("room:participants", list)

            // if room is empty, cleanup timers/state
            if (rooms.get(r).size === 0) {
              const state = roomStates.get(r)
              if (state?.roundTimer?.interval) clearInterval(state.roundTimer.interval)
              rooms.delete(r)
              roomStates.delete(r)
            }
          }
        } catch (e) {
          console.error('[io] delayed disconnect handler error', { sid: socket.id, e })
        } finally {
          disconnectTimers.delete(socket.id)
        }
      }, 3500)

      disconnectTimers.set(socket.id, timer)
      console.log("[io] disconnect (delayed)", socket.id)
    })

    // Allow a client (drawer) to request the current secret word if they didn't receive it
    socket.on('game:request-word', ({ roomId }) => {
      try {
        const state = roomStates.get(roomId)
        if (state && state.currentWordText) {
          socket.emit('game:word', { word: state.currentWordText, wordId: state.currentWordId })
          console.log('[io] replied to game:request-word', { roomId, to: socket.id, wordId: state.currentWordId })
        } else {
          // no word available yet
          socket.emit('game:word', { word: null, wordId: null })
        }
      } catch (e) {
        console.error('[io] game:request-word error', { roomId, e })
      }
    })

    // permet à un joueur de retourner individuellement en page d'attente
    socket.on('player:replay', async ({ roomId }) => {
      const r = roomId || socket.data.roomId
      const state = roomStates.get(r) || {}
      state.replayers = state.replayers || new Set()
      state.replayers.add(socket.id)
      roomStates.set(r, state)

      // envoie un état local au socket pour afficher la page d'attente
      socket.emit('room:state', { started: false, replay: true })

      // si TOUT le monde a cliqué Rejouer, on relance automatiquement une nouvelle manche
      const participantsMap = rooms.get(r) || new Map()
      const total = participantsMap.size
      const replayersCount = state.replayers.size

      if (total > 0 && replayersCount >= total) {
        // clear the replayers set for next round
        state.replayers = new Set()
        roomStates.set(r, state)
        // démarrer une nouvelle manche
        startNewRound(r)
      }
    })
  })

  res.end()
}
