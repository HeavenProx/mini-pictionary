// src/hooks/useRoomSocket.js
"use client"
import { useEffect, useState } from "react"
import { getSocket } from "@/lib/socket-client"

export function useRoomSocket(roomId, user) {
  const [participants, setParticipants] = useState([])

  useEffect(() => {
    if (!roomId) return
    const socket = getSocket()

    const onParticipants = (list) => setParticipants(list)

    socket.connect()
    socket.emit("room:join", { roomId, user })

    socket.on("room:participants", onParticipants)

    return () => {
      socket.emit("room:leave", { roomId })
      socket.off("room:participants", onParticipants)
      socket.disconnect()
    }
  }, [roomId, user?.id, user?.name])

  return { participants }
}
