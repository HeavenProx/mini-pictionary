// src/pages/api/socket.js
import { Server } from "socket.io"

// État en mémoire: roomId -> Map(socketId -> { id, name })
const rooms = new Map()

export const config = {
  api: { bodyParser: false }, // Socket.IO gère sa propre upgrade
}

export default function handler(req, res) {
  if (res.socket.server.io) {
    // déjà initialisé
    res.end()
    return
  }

  const io = new Server(res.socket.server, {
    path: "/api/socket",
    cors: { origin: "*" }, // en dev
  })
  res.socket.server.io = io

  io.on("connection", (socket) => {
    // client demande à rejoindre une room
    socket.on("room:join", ({ roomId, user }) => {
      if (!roomId) return

      socket.join(roomId)

      // register in memory
      if (!rooms.has(roomId)) rooms.set(roomId, new Map())
      rooms.get(roomId).set(socket.id, {
        id: user?.id || socket.id,
        name: user?.name || "Anonyme",
      })

      // broadcast la liste
      const list = Array.from(rooms.get(roomId).values())
      io.to(roomId).emit("room:participants", list)
    })

    // leave room (manuel)
    socket.on("room:leave", ({ roomId }) => {
      if (roomId && rooms.has(roomId)) {
        rooms.get(roomId).delete(socket.id)
        const list = Array.from(rooms.get(roomId).values())
        io.to(roomId).emit("room:participants", list)
        socket.leave(roomId)
      }
    })

    // déconnexion → update
    socket.on("disconnect", () => {
      for (const [roomId, map] of rooms.entries()) {
        if (map.has(socket.id)) {
          map.delete(socket.id)
          const list = Array.from(map.values())
          io.to(roomId).emit("room:participants", list)
        }
      }
    })
  })

  res.end()
}
