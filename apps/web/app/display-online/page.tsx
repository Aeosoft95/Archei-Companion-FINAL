'use client'
import { useEffect, useMemo, useRef, useState } from 'react'

type Clock = { id:string; name:string; segments:number; fill:number; visible:boolean }
type Scene = { title:string; color:string; image:string; visible:boolean }

function wsDefault(){
  if (process.env.NEXT_PUBLIC_WS_DEFAULT) return process.env.NEXT_PUBLIC_WS_DEFAULT
  if (typeof window !== 'undefined') {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    return `${proto}//${host}:8787`
  }
  return 'ws://localhost:8787'
}

export default function OnlineDisplay(){
  const [wsUrl, setWsUrl] = useState(wsDefault())
  const urlRoom = useMemo(()=> (typeof window!=='undefined' ? (new URLSearchParams(window.location.search).get('room') || '') : ''), [])
  const [room, setRoom] = useState(urlRoom || process.env.NEXT_PUBLIC_ROOM_DEFAULT || 'demo')

  const [scene, setScene] = useState<Scene>({ title:'', color:'#000', image:'', visible:true })
  const [clocks, setClocks] = useState<Clock[]>([])
  const [banner, setBanner] = useState<string>('')
  const [countdown, setCountdown] = useState<{running:boolean,totalMs:number,remainMs:number,label:string}>({running:false,totalMs:0,remainMs:0,label:''})

  const [connected,setConnected] = useState(false)
  const [connecting,setConnecting] = useState(false)
  const [error,setError] = useState<string|null>(null)
  const wsRef = useRef<WebSocket|null>(null)

  function connect(){
    try{
      setConnecting(true); setError(null)
      const ws = new WebSocket(wsUrl + `?room=${encodeURIComponent(room)}`)
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
      ws.onerror = ()=>{ setError(`Connessione fallita a ${wsUrl}`) }
    }catch(e:any){
      setConnecting(false); setConnected(false); setError(e?.message||'Errore di connessione.')
    }
  }

  useEffect(()=>{
    // autoconnect una volta all'apertura
    connect()
    return ()=>{ try{ wsRef.current?.close() }catch{} }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])

  // countdown tick locale
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
      {/* barra minimale per troubleshooting (visibile ai player, ma solo lettura) */}
      <div className="card flex items-center gap-3">
        <span className="text-sm">Stato:</span>
        <span className={`w-2.5 h-2.5 rounded-full ${connecting?'bg-yellow-500':connected?'bg-green-500':'bg-zinc-600'}`} />
        <span className="text-xs text-zinc-400">{connected ? 'online' : (connecting ? 'conn...' : 'offline')}</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-zinc-400">Room:</span>
          <code className="text-xs">{room}</code>
        </div>
      </div>
      {error && <div className="text-xs text-red-400">{error}</div>}

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
