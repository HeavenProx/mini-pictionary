"use client"
import { useEffect, useState } from "react"
import { getSocket } from "@/lib/socket-client"

export function useRoomSocket(roomId, user) {
  const [participants, setParticipants] = useState([])

  useEffect(() => {
    if (!roomId) return
    const socket = getSocket()
    if (!socket.connected) socket.connect()

    const onParticipants = (list) => setParticipants(list)

    // JOIN + ACK
    socket.emit("room:join", { roomId, user }, (ack) => {
      if (!ack?.ok) {
        console.warn("[client] room:join failed", ack)
      } else {
        console.log("[client] room:join OK", roomId)
      }
    })

    socket.on("room:participants", onParticipants)

    return () => {
      socket.emit("room:leave", { roomId })
      socket.off("room:participants", onParticipants)
      // ne pas disconnect le singleton ici
    }
  }, [roomId, user?.id, user?.name])

  return { participants }
}
