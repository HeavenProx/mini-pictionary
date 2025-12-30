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

  io.on("connection", (socket) => {
    console.log("[io] connection", socket.id)

    // ------- JOIN avec ACK -------
    socket.on("room:join", async ({ roomId, user }, ack) => {
      if (!roomId) return ack?.({ ok: false, error: "NO_ROOM" })
      socket.join(roomId)
      socket.data.roomId = roomId // on mémorise la room du socket

      if (!rooms.has(roomId)) rooms.set(roomId, new Map())
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

            state = { started: true, drawerSid, drawerName, drawerUserId: roomRec.drawerId, drawerSocketId: roomRec.drawerSocketId }
            roomStates.set(roomId, state)

            // envoyer roles / rôle individuel à tous les participants
            const sids = Array.from(participantsMap.keys())
            for (const sid of sids) {
              const role = sid === drawerSid ? "drawer" : "guesser"
              io.to(sid).emit("game:role", { role, drawerName, drawerUserId: roomRec.drawerId, drawerSocketId: roomRec.drawerSocketId })
            }
            io.to(roomId).emit("game:roles", { drawerSid, drawerName, drawerUserId: roomRec.drawerId, drawerSocketId: roomRec.drawerSocketId })
          }
        } catch (e) {
          console.error("[io] failed to sync room state from DB on join", { roomId, e })
        }
      }

      socket.emit("room:state", { started: state?.started || false })
      console.log("[io] room:state ->", { to: socket.id, roomId, started: state?.started || false })

      // si la partie est déjà commencée, indique le rôle au nouveau entrant
      if (state?.started) {
        const drawerSid = state.drawerSid || null
        const role = socket.id === drawerSid ? "drawer" : "guesser"
        socket.emit("game:role", { role, drawerName: state.drawerName, drawerUserId: state.drawerUserId, drawerSocketId: state.drawerSocketId })
        // en plus, envoyer qui est le drawerUserId si existant
        if (state.drawerUserId) {
          socket.emit("game:roles", { drawerSid, drawerName: state.drawerName, drawerUserId: state.drawerUserId })
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
        try {
          const updated = await prisma.room.update({ where: { id: r }, data: { started: true, drawerId: drawerUserId, drawerSocketId } })
          console.log("[io] persisted room state:", { roomId: r, started: updated.started, drawerId: updated.drawerId, drawerSocketId: updated.drawerSocketId })
        } catch (e) {
          console.error("[io] failed to persist room state", { roomId: r, e })
        }

        roomStates.set(r, { started: true, drawerSid, drawerName, drawerUserId, drawerSocketId })

        // broadcast state + event
        io.to(r).emit("room:state", { started: true })
        io.to(r).emit("game:started", { started: true })

        // envoie le rôle à chaque socket individuellement
        for (const sid of sids) {
          const role = sid === drawerSid ? "drawer" : "guesser"
          io.to(sid).emit("game:role", { role, drawerName, drawerUserId, drawerSocketId })
        }

        // broadcast info sur qui est le dessinateur pour l'UI
        io.to(r).emit("game:roles", { drawerSid, drawerName, drawerUserId, drawerSocketId })

        // envoie une confirmation à l'initiateur
        socket.emit("game:start:ok", { roomId: r, drawerSid, drawerName, drawerUserId, drawerSocketId })
        // log recipients count for debugging
        const roomSet = io.sockets.adapter.rooms.get(r)
        const recipients = roomSet ? roomSet.size : 0
        console.log("[io] game:start", { roomId: r, by: socket.id, recipients, drawerSid, drawerName, drawerUserId })
        console.log("[io] game:started emitted", { roomId: r, recipients, drawerSid, drawerName, drawerUserId })
      } catch (err) {
        console.error("[io] game:start error:", err)
        socket.emit("game:start:denied", { reason: "SERVER_ERROR" })
      }
    })

    // ------- CHAT (diffusion à la room) -------
    socket.on("chat:message", ({ roomId, text, user }) => {
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
      if (r && rooms.has(r)) {
        rooms.get(r).delete(socket.id)
        const list = Array.from(rooms.get(r).values())
        io.to(r).emit("room:participants", list)
      }
      console.log("[io] disconnect", socket.id)
    })
  })

  res.end()
}
