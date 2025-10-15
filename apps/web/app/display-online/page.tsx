
'use client'
import { useState } from 'react'
export default function DisplayOnline(){
  const [wsUrl, setWsUrl] = useState(process.env.NEXT_PUBLIC_WS_DEFAULT || 'ws://localhost:8787')
  const [room, setRoom] = useState(process.env.NEXT_PUBLIC_ROOM_DEFAULT || 'demo')
  function connect(){
    try{
      const ws = new WebSocket(wsUrl + `?room=${encodeURIComponent(room)}`)
      ws.onopen = ()=> ws.send(JSON.stringify({ t:'join', room, nick:'display', role:'player' }))
      ws.onmessage = (ev)=>{ try{ const msg = JSON.parse(ev.data); const bc = new BroadcastChannel('archei-display'); bc.postMessage(msg); bc.close() }catch{} }
    }catch{}
  }
  return (
    <div className="p-4 space-y-3">
      <div className="card space-y-2">
        <div className="label">WS URL</div><input className="input" value={wsUrl} onChange={e=>setWsUrl(e.target.value)} />
        <div className="label">Room</div><input className="input" value={room} onChange={e=>setRoom(e.target.value)} />
        <button className="btn" onClick={connect}>Connetti Display</button>
      </div>
      <div className="card p-0 overflow-hidden"><iframe src="/display" className="w-full h-[70vh]"></iframe></div>
    </div>
  )
}
