import { Server } from "socket.io"

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

  io.on("connection", (socket) => {
    console.log("[io] connection", socket.id)

    // ------- JOIN avec ACK -------
    socket.on("room:join", ({ roomId, user }, ack) => {
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
      }
      socket.leave(r)
      socket.data.roomId = undefined
      console.log("[io] room:leave", { roomId: r, sid: socket.id })
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
