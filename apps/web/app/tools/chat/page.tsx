'use client'
import { useEffect, useRef, useState } from 'react'

/** ===== Tipi ===== */
type Msg = { nick: string; text: string; ts: number }
type InitEntry = { id?: string; name: string; init: number }
type Initiative = { entries: InitEntry[]; active: number; round: number; visible: boolean }
type SceneMsg = { title?: string; text?: string; images?: string[] }
type CountdownItem = { label: string; value: number; max: number }
type CountdownMsg = { items: CountdownItem[] }
type ClockItem = { name: string; value: number; max: number }
type ClocksMsg = { clocks: ClockItem[] }

/** ===== Utils ===== */
function wsDefault(): string {
  if (process.env.NEXT_PUBLIC_WS_DEFAULT) return process.env.NEXT_PUBLIC_WS_DEFAULT
  if (typeof window !== 'undefined') {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${proto}//${window.location.hostname}:8787`
  }
  return 'ws://localhost:8787'
}

/** ===== Pagina Chat Player ===== */
export default function ChatPlayerPage() {
  // Evita problemi di hydration: non fare return anticipati
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  /** --- Stato WS e connessione --- */
  const [wsUrl, setWsUrl] = useState(wsDefault())
  const [room, setRoom] = useState(process.env.NEXT_PUBLIC_ROOM_DEFAULT || 'demo')
  const [nick, setNick] = useState('Player')
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [wsError, setWsError] = useState<string | null>(null)
  const [wsPanel, setWsPanel] = useState(false)
  const socketRef = useRef<WebSocket | null>(null)

  /** --- Chat --- */
  const [messages, setMessages] = useState<Msg[]>([])
  function send(text: string) {
    const ws = socketRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ t: 'chat:msg', room, nick, text, ts: Date.now(), channel: 'global' }))
  }

  /** --- Pannelli in sola lettura --- */
  const [scene, setScene] = useState<SceneMsg>({})
  const [countdown, setCountdown] = useState<CountdownMsg>({ items: [] })
  const [clocks, setClocks] = useState<ClocksMsg>({ clocks: [] })
  const [initiative, setInitiative] = useState<Initiative>({ entries: [], active: 0, round: 1, visible: false })

  /** --- Effetti iniziali --- */
  useEffect(() => {
    if (!mounted) return
    const savedRole = (localStorage.getItem('archei:role') as 'gm' | 'player') || 'player'
    if (savedRole !== 'player') localStorage.setItem('archei:role', 'player')
    setNick(localStorage.getItem('archei:nick') || 'Player')
  }, [mounted])

  /** --- Connessione WS --- */
  function statusDot() {
    const color = connecting ? 'bg-yellow-500' : connected ? 'bg-green-500' : wsError ? 'bg-red-500' : 'bg-zinc-600'
    const label = connecting ? 'conn…' : connected ? 'online' : wsError ? 'errore' : 'offline'
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <div className={`w-2.5 h-2.5 rounded-full ${color}`} /> {label}
      </div>
    )
  }

  function connect() {
    try {
      if (!nick.trim()) { setWsError('Inserisci un nick.'); return }
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) socketRef.current.close()
      setConnecting(true); setWsError(null)
      const ws = new WebSocket(wsUrl + `?room=${encodeURIComponent(room)}`)
      socketRef.current = ws
      ws.onopen = () => {
        setConnecting(false); setConnected(true)
        ws.send(JSON.stringify({ t: 'join', room, nick, role: 'player' }))
      }
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          if (msg.t === 'chat:msg') setMessages(m => [...m, { nick: msg.nick, text: msg.text, ts: msg.ts }])

          if (msg.t === 'DISPLAY_SCENE_STATE') setScene({ title: msg.title, text: msg.text, images: msg.images || [] })
          if (msg.t === 'DISPLAY_COUNTDOWN' && msg.items) setCountdown({ items: msg.items })
          if (msg.t === 'DISPLAY_CLOCKS_STATE' && msg.clocks) setClocks({ clocks: msg.clocks })
          if (msg.t === 'DISPLAY_INITIATIVE_STATE' && msg.initiative) setInitiative(msg.initiative)
        } catch { /* ignore */ }
      }
      ws.onclose = () => { setConnected(false); setConnecting(false) }
      ws.onerror = () => { setWsError(`Connessione fallita a ${wsUrl}.`) }
    } catch (e: any) {
      setConnecting(false); setConnected(false); setWsError(e?.message || 'Errore di connessione.')
    }
  }

  function disconnect() {
    try { socketRef.current?.close() } catch { /* ignore */ }
    setConnected(false)
  }

  /** --- Render --- */
  return (
    <div className="min-h-screen flex flex-col gap-4">
      {/* TOPBAR */}
      <div className="border-b border-zinc-800 p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-lg font-semibold">Archei Companion</div>
          <button className="btn !bg-zinc-800" onClick={() => setWsPanel(v => !v)}>WS</button>
          {statusDot()}
        </div>
        <div className="text-xs text-zinc-500">Player</div>
      </div>

      {wsPanel && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3 grid sm:grid-cols-5 gap-2">
          <div className="sm:col-span-3">
            <div className="label">WS URL</div>
            <input className="input" value={wsUrl} onChange={e => setWsUrl(e.target.value)} placeholder="ws://host:8787" />
          </div>
          <div>
            <div className="label">Room</div>
            <input className="input" value={room} onChange={e => setRoom(e.target.value)} />
          </div>
          <div>
            <div className="label">Nick</div>
            <input className="input" value={nick} onChange={e => setNick(e.target.value)} />
          </div>
          <div className="sm:col-span-5 flex gap-2">
            {!connected
              ? <button className="btn" onClick={connect} disabled={connecting || !nick.trim()}>{connecting ? 'Connessione…' : 'Connettiti'}</button>
              : <button className="btn !bg-zinc-800" onClick={disconnect}>Disconnetti</button>
            }
            {wsError && <div className="text-xs text-red-400 self-center">{wsError}</div>}
          </div>
        </div>
      )}

      {/* DUE COLONNE: sx CHAT, dx pannelli readonly */}
      <div className="grid xl:grid-cols-[1.1fr_1fr] gap-4 flex-1 min-h-0">
        {/* COLONNA SINISTRA — CHAT */}
        <div className="card flex flex-col max-h-[70vh]">
          <div className="font-semibold mb-2">Chat</div>
          <div className="flex-1 overflow-auto">
            {messages.length === 0 ? (
              <div className="text-sm text-zinc-500">Nessun messaggio.</div>
            ) : (
              <div className="space-y-2">
                {messages.map((m, i) => (
                  <div key={i} className="bg-zinc-900/50 rounded-xl px-3 py-2">
                    <span className="text-teal-400">{m.nick}:</span> {m.text}
                  </div>
                ))}
              </div>
            )}
          </div>
          <ChatInput onSend={send} disabled={!connected} />
        </div>

        {/* COLONNA DESTRA — PANNELLI */}
        <div className="space-y-4 min-h-0">
          {/* SCENA */}
          <div className="card space-y-2">
            <div className="font-semibold">Scena</div>
            {(!scene.title && !scene.text && !(scene.images?.length)) ? (
              <div className="text-sm text-zinc-500">In attesa di scena…</div>
            ) : (
              <>
                {scene.images?.[0] && (
                  <img src={scene.images[0]} alt="" className="w-full h-40 md:h-56 object-cover rounded-xl border border-zinc-800" />
                )}
                {scene.title && <div className="text-xl font-bold">{scene.title}</div>}
                {scene.text && <div className="whitespace-pre-wrap text-zinc-200">{scene.text}</div>}
                {scene.images && scene.images.length > 1 && (
                  <div className="flex gap-2 flex-wrap">
                    {scene.images.slice(1).map((src, i) => (
                      <img key={i} src={src} alt="" className="w-28 h-20 rounded-lg object-cover border border-zinc-800" />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* COUNTDOWN */}
          <div className="card space-y-2">
            <div className="font-semibold">Countdown</div>
            {countdown.items.length === 0 ? (
              <div className="text-sm text-zinc-500">Nessun countdown.</div>
            ) : countdown.items.map((c, i) => {
              const pct = Math.max(0, Math.min(100, Math.round((c.value / (c.max || 1)) * 100)))
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-300">{c.label}</span>
                    <span className="text-zinc-400">{c.value}/{c.max}</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* CLOCKS */}
          <div className="card space-y-2">
            <div className="font-semibold">Clocks</div>
            {clocks.clocks.length === 0 ? (
              <div className="text-sm text-zinc-500">Nessun clock.</div>
            ) : clocks.clocks.map((c, i) => {
              const pct = Math.max(0, Math.min(100, Math.round((c.value / (c.max || 1)) * 100)))
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-300">{c.name}</span>
                    <span className="text-zinc-400">{c.value}/{c.max}</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* INIZIATIVA */}
          <div className="card space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Iniziativa</div>
              {!initiative.visible && <span className="text-xs text-zinc-500">nascosta</span>}
            </div>
            {(initiative.visible && initiative.entries.length > 0) ? (
              <>
                <div className="text-xs text-zinc-400">Round {initiative.round}</div>
                <div className="flex flex-wrap gap-2">
                  {initiative.entries.map((e, i) => (
                    <div
                      key={e.id || e.name}
                      className={`px-3 py-1 rounded-xl border ${i === initiative.active ? 'border-teal-500 bg-teal-600/20' : 'border-zinc-700 bg-zinc-800/50'}`}
                    >
                      <span className="font-semibold">{e.name}</span>
                      <span className="text-xs text-zinc-400 ml-2">({e.init})</span>
                      {i === initiative.active && <span className="ml-2 text-teal-400">● turno</span>}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-sm text-zinc-500">In attesa di iniziativa…</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** ===== Componente Input chat ===== */
function ChatInput({ onSend, disabled }: { onSend: (txt: string) => void; disabled?: boolean }) {
  const [txt, setTxt] = useState('')
  return (
    <div className="mt-3 flex gap-2">
      <input
        className="input"
        value={txt}
        disabled={disabled}
        onChange={e => setTxt(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && txt.trim() && !disabled) { onSend(txt); setTxt('') } }}
        placeholder={disabled ? 'Non connesso…' : 'Scrivi… (Invio per inviare)'}
      />
      <button className="btn" onClick={() => { if (txt.trim() && !disabled) { onSend(txt); setTxt('') } }} disabled={disabled}>
        Invia
      </button>
    </div>
  )
}
