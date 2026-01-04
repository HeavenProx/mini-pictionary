import { NextResponse } from 'next/server'
import net from 'net'

export async function GET() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = Number(process.env.SMTP_PORT || 587)
  const timeoutMs = 10000

  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port })

    let settled = false
    const done = (status, body) => {
      if (settled) return
      settled = true
      try { socket.destroy() } catch (e) {}
      resolve(NextResponse.json(body, status ? { status } : undefined))
    }

    const onError = (err) => done(500, { ok: false, error: err && err.message ? err.message : String(err) })
    const onTimeout = () => done(504, { ok: false, error: 'timeout' })

    socket.setTimeout(timeoutMs)
    socket.once('connect', () => done(200, { ok: true, host, port, msg: 'connected' }))
    socket.once('error', onError)
    socket.once('timeout', onTimeout)
  })
}
