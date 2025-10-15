
'use client'
import { useState } from 'react'
export default function ScenePage(){
  const [wsUrl, setWsUrl] = useState(process.env.NEXT_PUBLIC_WS_DEFAULT || 'ws://localhost:8787')
  const [room, setRoom] = useState(process.env.NEXT_PUBLIC_ROOM_DEFAULT || 'demo')
  const [title, setTitle] = useState('Scena di prova')
  const [color, setColor] = useState('#0b132b')
  const [image, setImage] = useState('')
  const [visible, setVisible] = useState(true)
  const [label,setLabel] = useState('Countdown')
  const [secs,setSecs] = useState(30)
  function send(msg:any){
    const bc = new BroadcastChannel('archei-display'); bc.postMessage(msg); bc.close()
    try{ const ws = new WebSocket(wsUrl + `?room=${encodeURIComponent(room)}`); ws.onopen=()=>{ ws.send(JSON.stringify({ t:'join', room, nick:'GM', role:'gm' })); ws.send(JSON.stringify(msg)); setTimeout(()=>ws.close(), 200) } }catch{}
  }
  function pushScene(){ send({ t:'DISPLAY_SCENE_STATE', room, scene:{ title, color, image, visible } }) }
  function banner(){ send({ t:'DISPLAY_BANNER', room, text:'Benvenuti!' }) }
  function toggleCountdown(run:boolean){ send({ t:'DISPLAY_COUNTDOWN', room, countdown:{ running: run, totalMs: secs*1000, remainMs: secs*1000, label } }) }
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="card space-y-2">
        <div className="label">WS URL</div><input className="input" value={wsUrl} onChange={e=>setWsUrl(e.target.value)} />
        <div className="label">Room</div><input className="input" value={room} onChange={e=>setRoom(e.target.value)} />
        <div className="label">Titolo</div><input className="input" value={title} onChange={e=>setTitle(e.target.value)} />
        <div className="label">Colore</div><input className="input" value={color} onChange={e=>setColor(e.target.value)} />
        <div className="label">Immagine (URL)</div><input className="input" value={image} onChange={e=>setImage(e.target.value)} />
        <label className="label flex items-center gap-2"><input type="checkbox" checked={visible} onChange={e=>setVisible(e.target.checked)}/>Visibile</label>
        <div className="flex gap-2"><button className="btn" onClick={pushScene}>Invia al Display</button><button className="btn" onClick={banner}>Banner</button></div>
        <div className="label">Countdown</div>
        <div className="grid grid-cols-3 gap-2">
          <input className="input" value={label} onChange={e=>setLabel(e.target.value)} />
          <input className="input" type="number" value={secs} onChange={e=>setSecs(parseInt(e.target.value||'0'))} />
          <div className="flex gap-2"><button className="btn" onClick={()=>toggleCountdown(true)}>Start</button><button className="btn" onClick={()=>toggleCountdown(false)}>Stop</button></div>
        </div>
      </div>
      <div className="card">
        <div className="text-sm text-zinc-400 mb-2">Anteprima</div>
        <div className="rounded-2xl overflow-hidden h-64 relative" style={{background:image?`url(${image}) center/cover` : color as any}}>
          <div className="absolute inset-0 bg-black/30 flex items-end p-4"><div className="text-2xl font-semibold">{title}</div></div>
        </div>
      </div>
    </div>
  )
}
