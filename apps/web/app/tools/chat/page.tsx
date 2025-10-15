'use client'
import { useEffect, useRef, useState } from 'react'
import DicePreview from '@/components/DicePreview'
import { archeiRoll } from '@shared/dice'

type Msg = { nick: string; text: string; ts: number }

export default function ChatPage() {
  const [wsUrl, setWsUrl] = useState('ws://192.168.1.74:8787')
  const [room, setRoom] = useState('demo')
  const [nick, setNick] = useState<string>('')
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const socketRef = useRef<WebSocket | null>(null)

  // Chat state
  const [messages, setMessages] = useState<Msg[]>([])
  const listRef = useRef<HTMLDivElement | null>(null)
  const seenRef = useRef<Set<string>>(new Set()) // dedup

  // Dice state
  const [total, setTotal] = useState(5)
  const [real, setReal] = useState(5)
  const [last, setLast] = useState<any>(null)
  const [rolling, setRolling] = useState(false)

  useEffect(() => {
    const role = localStorage.getItem('archei:role') || 'player'
    setNick(localStorage.getItem('archei:nick') || (role === 'gm' ? 'GM' : 'Player'))
  }, [])

  useEffect(() => {
    listRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' })
  }, [messages.length])

  function connect() {
    try {
      if (!nick.trim()) { setError('Inserisci un nick.'); return }
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) socketRef.current.close()
      setConnecting(true); setError(null)

      const ws = new WebSocket(wsUrl + `?room=${encodeURIComponent(room)}`)
      socketRef.current = ws

      ws.onopen = () => {
        setConnecting(false); setConnected(true)
        ws.send(JSON.stringify({ t: 'join', room, nick: nick || 'GM', role: localStorage.getItem('archei:role') || 'player' }))
        ws.send(JSON.stringify({ t: 'chat:join', room, nick: nick || 'GM' }))
      }

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          if (msg.t === 'chat:msg') {
            const id = `${msg.nick}|${msg.ts}|${msg.text}`
            if (!seenRef.current.has(id)) {
              seenRef.current.add(id)
              if (seenRef.current.size > 200) {
                const first = seenRef.current.values().next().value
                if (first) seenRef.current.delete(first)
              }
              setMessages(m => [...m, { nick: msg.nick, text: msg.text, ts: msg.ts }])
            }
          }
        } catch {}
      }

      ws.onclose = () => { setConnected(false); setConnecting(false) }
      ws.onerror  = () => { setError(`Connessione fallita a ${wsUrl}.`) }
    } catch (e:any) {
      setConnecting(false); setConnected(false); setError(e?.message || 'Errore di connessione.')
    }
  }

  function disconnect() {
    try { socketRef.current?.close() } catch {}
    setConnected(false)
  }

  function send(text: string) {
    const ws = socketRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    const payload = { t:'chat:msg', room, nick: nick || 'GM', text, ts: Date.now(), channel:'global' }
    ws.send(JSON.stringify(payload))

    // 🔵 AGGIORNAMENTO OTTIMISTICO + DEDUP
    const id = `${payload.nick}|${payload.ts}|${payload.text}`
    if (!seenRef.current.has(id)) {
      seenRef.current.add(id)
      setMessages(m => [...m, { nick: payload.nick, text: payload.text, ts: payload.ts }])
    }
  }

  async function roll() {
    if (rolling || !connected) return
    setRolling(true)
    try {
      const tot = Math.max(0, Number.isFinite(total) ? total : 0)
      const rea = Math.max(0, Math.min(5, Number.isFinite(real) ? real : 0))
      const res = archeiRoll(tot, rea)
      setLast(res)
      const text =
        `Tiro ARCHEI — tot:${res.totalDice}, reali:${res.realDice}, soglia:${res.threshold}, ` +
        `tiri:[${res.rolls.join(',')}], successi:${res.successes}${res.fiveOfFive ? ' (CRITICO 5/5)' : ''}`
      send(text)
      await new Promise(r => setTimeout(r, 400))
    } finally {
      setRolling(false)
    }
  }

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {/* Pannello */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Chat + Tiradadi</div>
          <StatusDot connected={connected} connecting={connecting} />
        </div>

        <div className="label">WS URL</div>
        <input className="input" value={wsUrl} onChange={(e)=>setWsUrl(e.target.value)} placeholder="ws://host:8787" />
        <div className="label">Room</div>
        <input className="input" value={room} onChange={(e)=>setRoom(e.target.value)} />
        <div className="label">Nick</div>
        <input className="input" value={nick} onChange={(e)=>setNick(e.target.value)} />

        <div className="flex gap-2">
          {!connected ? (
            <button className="btn" onClick={connect} disabled={connecting || !nick.trim()}>
              {connecting ? 'Connessione…' : 'Connettiti'}
            </button>
          ) : (
            <button className="btn !bg-zinc-800" onClick={disconnect}>Disconnetti</button>
          )}
        </div>

        {error && <div className="text-xs text-red-400">{error}</div>}

        <div className="border-t border-zinc-800 pt-3 space-y-2">
          <div className="font-semibold">Tiradadi ARCHEI</div>
          <div className="label">Dadi totali (teorici)</div>
          <input className="input" type="number" value={total} onChange={(e)=>setTotal(Number(e.target.value || 0))} />
          <div className="label">Dadi reali (max 5)</div>
          <input className="input" type="number" value={real} onChange={(e)=>setReal(Math.min(5, Math.max(0, Number(e.target.value || 0))))} />
          <button className="btn" onClick={roll} disabled={!connected || rolling}>{rolling ? 'Lancio…' : 'Lancia'}</button>
          {last && (
            <div className="space-y-2">
              <div className="text-sm text-zinc-400">
                Soglia: {last.threshold} • Successi: <span className="text-green-400">{last.successes}</span>
              </div>
              <DicePreview rolls={last.rolls} threshold={last.threshold} />
            </div>
          )}
        </div>
      </div>

      {/* Box Chat */}
      <div className="md:col-span-2 card flex flex-col min-h-[420px]">
        <div ref={listRef} className="flex-1 overflow-auto space-y-2 max-h-[60vh] min-h-[300px] p-1 rounded-xl">
          {messages.length === 0 && <div className="text-sm text-zinc-500">Nessun messaggio.</div>}
          {messages.map((m, i) => (
            <div key={i} className="bg-zinc-900/50 rounded-xl px-3 py-2">
              <span className="text-teal-400">{m.nick}:</span> {m.text}
            </div>
          ))}
        </div>
        <ChatInput onSend={send} disabled={!connected} />
      </div>
    </div>
  )
}

function StatusDot({ connected, connecting }: { connected: boolean; connecting: boolean }) {
  const color = connecting ? 'bg-yellow-500' : connected ? 'bg-green-500' : 'bg-zinc-600'
  const label = connecting ? 'conn...' : connected ? 'online' : 'offline'
  return (
    <div className="flex items-center gap-2 text-xs text-zinc-400">
      <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
      {label}
    </div>
  )
}

function ChatInput({ onSend, disabled }: { onSend: (txt: string) => void; disabled?: boolean }) {
  const [txt, setTxt] = useState('')
  const [sending, setSending] = useState(false)

  async function submit() {
    if (disabled || sending) return
    const v = txt.trim()
    if (!v) return
    setSending(true)
    onSend(v)
    setTxt('')
    await new Promise(r => setTimeout(r, 250)) // anti-doppio invio
    setSending(false)
  }

  return (
    <div className="mt-3 flex gap-2">
      <input
        className="input"
        value={txt}
        disabled={disabled}
        onChange={(e) => setTxt(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
        placeholder={disabled ? 'Non connesso…' : 'Scrivi… (Invio per inviare)'}
      />
      <button className="btn" onClick={submit} disabled={disabled || sending}>
        {sending ? 'Invio…' : 'Invia'}
      </button>
    </div>
  )
}
