import http from 'http'
import { WebSocketServer, WebSocket } from 'ws'

type Ctx = { room: string; nick: string; role: 'gm' | 'player' }

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' })
  res.end('ARCHEI realtime WS OK')
})

const wss = new WebSocketServer({ server })
const clients = new Map<WebSocket, Ctx>()
const sceneByRoom = new Map<string, any>()
const countdownByRoom = new Map<string, any>()

function broadcast(room: string, data: any) {
  const payload = JSON.stringify(data)
  for (const [ws, ctx] of clients) {
    if (ctx.room === room && ws.readyState === ws.OPEN) ws.send(payload)
  }
}

function presence(room: string) {
  const nicks = [...clients.values()]
    .filter(c => c.room === room)
    .map(c => c.nick)
  broadcast(room, { t: 'chat:presence', room, nicks })
}

wss.on('connection', (ws, req) => {
  const ip = (req.socket.remoteAddress || '').replace('::ffff:', '')
  console.log(`[WS] conn ${ip}`)

  const url = new URL(req.url || '', `http://${req.headers.host}`)
  const roomDefault = url.searchParams.get('room') || 'demo'

  clients.set(ws, { room: roomDefault, nick: 'anon', role: 'player' })

  ws.on('message', (buf) => {
    let msg: any
    try {
      msg = JSON.parse(buf.toString())
    } catch {
      return
    }

    const ctx = clients.get(ws)
    if (!ctx) return

    // Gestione join
    if (msg.t === 'join') {
      ctx.room = msg.room || roomDefault
      ctx.nick = msg.nick || 'anon'
      ctx.role = msg.role || 'player'
      ws.send(JSON.stringify({ t: 'joined', room: ctx.room, nick: ctx.nick, role: ctx.role }))
      presence(ctx.room)

      const sc = sceneByRoom.get(ctx.room)
      if (sc) ws.send(JSON.stringify(sc))
      const cd = countdownByRoom.get(ctx.room)
      if (cd) ws.send(JSON.stringify(cd))
      return
    }

    // Gestione messaggi broadcast
    const r = msg.room || ctx.room
    if (typeof msg.t === 'string') {
      if (msg.t.startsWith('DISPLAY_')) {
        if (msg.t === 'DISPLAY_SCENE_STATE') sceneByRoom.set(r, msg)
        if (msg.t === 'DISPLAY_COUNTDOWN') countdownByRoom.set(r, msg)
        broadcast(r, msg)
        return
      }
      if (msg.t.startsWith('chat:')) {
        if (msg.t === 'chat:msg') msg.ts = msg.ts || Date.now()
        broadcast(r, msg)
        return
      }
    }
  })

  ws.on('close', () => {
    const ctx = clients.get(ws)
    clients.delete(ws)
    if (ctx) presence(ctx.room)
  })
})

const PORT = 8787
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[WS] listening on 0.0.0.0:${PORT}`)
})
