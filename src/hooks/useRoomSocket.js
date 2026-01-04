"use client"
import { useEffect, useState } from "react"
import { getSocket } from "@/lib/socket-client"

export function useRoomSocket(roomId, user) {
  const [participants, setParticipants] = useState([])

  // conserve la dernière liste sérialisée pour éviter des setState inutiles
  const lastSerializedRef = { current: null }

  useEffect(() => {
    if (!roomId) return
    const socket = getSocket()
    if (!socket.connected) socket.connect()

    const onParticipants = (list) => {
      try {
        // normalise: map ids/names, trie par id pour que l'ordre stable ne provoque pas de différences
        const norm = (list || []).map(p => ({ id: String(p.id || ''), name: p.name || '' })).sort((a, b) => (a.id > b.id ? 1 : a.id < b.id ? -1 : 0))
        const ser = JSON.stringify(norm)
        if (ser !== lastSerializedRef.current) {
          lastSerializedRef.current = ser
          setParticipants(norm)
        }
      } catch (e) {
        setParticipants(list)
      }
    }

    // JOIN + ACK — depend uniquement des primitives pour éviter ré-emits quand l'objet user change de référence
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
