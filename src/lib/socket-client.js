// src/lib/socket-client.js
import { io } from "socket.io-client"

let socket

export function getSocket() {
  if (!socket) {
    socket = io({
      path: "/api/socket",
      autoConnect: false,
    })
  }
  return socket
}
