'use client'
import { useEffect, useMemo, useRef, useState } from 'react'

type Clock = { id:string; name:string; segments:number; fill:number; visible:boolean }
type Scene = { title:string; color:string; image:string; visible:boolean }

function wsDefault(){
  if (typeof window === 'undefined') return 'ws://localhost:8787'
  const saved = localStorage.getItem('archei:wsURL')
  if (saved) return saved
  if (process.env.NEXT_PUBLIC_WS_DEFAULT) return process.env.NEXT_PUBLIC_WS_DEFAULT
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.hostname
  return `${proto}//${host}:8787`
}

export default function OnlineDisplay(){
  // URL e ROOM modificabili dai player
  const [wsUrl, setWsUrl] = useState<string>(wsDefault())
  const urlRoom = useMemo(()=> (typeof window!=='undefined' ? (new URLSearchParams(window.location.search).get('room') || '') : ''), [])
  const [room, setRoom] = useState<string>(urlRoom || process.env.NEXT_PUBLIC_ROOM_DEFAULT || 'demo')

  // Stato Display
  const [scene, setScene] = useState<Scene>({ title:'', color:'#000', image:'', visible:true })
  const [clocks, setClocks] = useState<Clock[]>([])
  const [banner, setBanner] = useState<string>('')
  const [countdown, setCountdown] = useState<{running:boolean,totalMs:number,remainMs:number,label:string}>({running:false,totalMs:0,remainMs:0,label:''})

  // Stato connessione
  const [connected,setConnected] = useState(false)
  const [connecting,setConnecting] = useState(false)
  const [error,setError] = useState<string|null>(null)
  const wsRef = useRef<WebSocket|null>(null)

  // Connetti / Disconnetti
  function connect(){
    try{
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) wsRef.current.close()
      setConnecting(true); setError(null)
      const url = wsUrl.trim()
      if (!url) { setError('Inserisci un WS URL'); setConnecting(false); return }
      try { localStorage.setItem('archei:wsURL', url) } catch {}
      const ws = new WebSocket(url + `?room=${encodeURIComponent(room)}`)
      wsRef.current = ws

      ws.onopen = ()=>{
        setConnecting(false); setConnected(true)
        ws.send(JSON.stringify({ t:'join', room, nick:'display', role:'player' }))
      }
      ws.onmessage = (ev)=>{
        try{
          const msg = JSON.parse(ev.data)
          if (!msg || msg.room!==room) return
          if (msg.t==='DISPLAY_SCENE_STATE' && msg.scene) setScene(msg.scene)
          if (msg.t==='DISPLAY_CLOCKS_STATE' && msg.clocks) setClocks(msg.clocks || [])
          if (msg.t==='DISPLAY_BANNER' && typeof msg.text==='string'){ setBanner(msg.text); setTimeout(()=>setBanner(''), 3000) }
          if (msg.t==='DISPLAY_COUNTDOWN' && msg.countdown) setCountdown(msg.countdown)
        }catch{}
      }
      ws.onclose = ()=>{ setConnected(false); setConnecting(false) }
      ws.onerror = ()=>{ setError(`Connessione fallita a ${url}`) }
    }catch(e:any){
      setConnecting(false); setConnected(false); setError(e?.message||'Errore di connessione.')
    }
  }
  function disconnect(){ try{ wsRef.current?.close() }catch{}; setConnected(false) }

  // Autoconnect solo al primo caricamento (con wsUrl precompilato)
  useEffect(()=>{ connect(); /* eslint-disable-next-line */ },[])

  // Countdown tick locale
  useEffect(()=>{
    if(!countdown.running) return
    const start = Date.now()
    const startRemain = countdown.remainMs ?? countdown.totalMs
    const id = setInterval(()=>{
      const elapsed = Date.now()-start
      const remain = Math.max(0, startRemain - elapsed)
      setCountdown(c=>({...c, remainMs: remain }))
    }, 200)
    return ()=>clearInterval(id)
  },[countdown.running])

  return (
    <div className="space-y-4">
      {/* Barra controllo player */}
      <div className="card grid lg:grid-cols-4 gap-3 items-end">
        <div className="lg:col-span-2">
          <div className="label">WS URL</div>
          <input
            className="input"
            value={wsUrl}
            onChange={(e)=>setWsUrl(e.target.value)}
            placeholder="ws://IP:8787 oppure wss://dominio/ws"
          />
        </div>
        <div>
          <div className="label">Room</div>
          <input className="input" value={room} onChange={(e)=>setRoom(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {!connected ? (
            <button className="btn" onClick={connect} disabled={connecting}>{connecting ? 'Connessione…' : 'Connetti'}</button>
          ) : (
            <button className="btn !bg-zinc-800" onClick={disconnect}>Disconnetti</button>
          )}
        </div>
        {error && <div className="lg:col-span-4 text-xs text-red-400">{error}</div>}
        <div className="lg:col-span-4 flex items-center gap-2 text-xs text-zinc-400">
          <span>Stato:</span>
          <span className={`w-2.5 h-2.5 rounded-full ${connecting?'bg-yellow-500':connected?'bg-green-500':'bg-zinc-600'}`} />
          <span>{connected ? 'online' : (connecting ? 'conn...' : 'offline')}</span>
        </div>
      </div>

      {/* SCENA */}
      <div className="rounded-2xl overflow-hidden h-[55vh] relative" style={{ background: scene.image ? undefined : scene.color }}>
        {scene.image && <div className="absolute inset-0 bg-center bg-cover" style={{backgroundImage:`url(${scene.image})`}}/>}
        <div className="absolute inset-0 bg-black/35 flex items-end p-6">
          <div className="text-3xl font-semibold">{scene.title}</div>
        </div>
      </div>

      {/* BANNER */}
      {banner && (
        <div className="fixed left-1/2 -translate-x-1/2 top-6 bg-black/70 border border-zinc-700 px-4 py-2 rounded-xl text-lg z-10">
          {banner}
        </div>
      )}

      {/* COUNTDOWN */}
      {countdown.running && (
        <div className="flex items-center gap-3">
          <div className="text-sm text-zinc-400">{countdown.label || 'Timer'}</div>
          <div className="text-2xl font-mono">{formatMs(countdown.remainMs ?? countdown.totalMs)}</div>
        </div>
      )}

      {/* CLOCKS */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {clocks.filter(c=>c.visible).map(c=>(
          <div key={c.id} className="card">
            <div className="text-sm text-zinc-400">{c.name}</div>
            <div className="mt-2 grid grid-cols-6 gap-1">
              {Array.from({length:c.segments}).map((_,i)=>(
                <div key={i} className={`h-2 rounded ${i<c.fill?'bg-teal-500':'bg-zinc-800'}`}/>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatMs(ms:number){
  const s = Math.ceil(ms/1000)
  const m = Math.floor(s/60)
  const r = s%60
  return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`
}
