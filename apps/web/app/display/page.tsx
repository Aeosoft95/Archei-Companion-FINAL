'use client'
import { useEffect, useState } from 'react'

type Clock = { id:string; name:string; segments:number; fill:number; visible:boolean }
type Scene = { title:string; color:string; image:string; visible:boolean }

export default function LocalDisplay(){
  const [scene, setScene] = useState<Scene>({ title:'', color:'#000', image:'', visible:true })
  const [clocks, setClocks] = useState<Clock[]>([])
  const [banner, setBanner] = useState<string>('')
  const [countdown, setCountdown] = useState<{running:boolean,totalMs:number,remainMs:number,label:string}>({running:false,totalMs:0,remainMs:0,label:''})

  useEffect(()=>{
    const bc = new BroadcastChannel('archei-display')
    bc.onmessage = (ev:MessageEvent<any>)=>{
      const msg = ev.data
      if(!msg || msg.room==null) return
      if(msg.t==='DISPLAY_SCENE_STATE' && msg.scene) setScene(msg.scene)
      if(msg.t==='DISPLAY_CLOCKS_STATE' && msg.clocks) setClocks(msg.clocks || [])
      if(msg.t==='DISPLAY_BANNER' && typeof msg.text==='string'){ setBanner(msg.text); setTimeout(()=>setBanner(''), 3000) }
      if(msg.t==='DISPLAY_COUNTDOWN' && msg.countdown) setCountdown(msg.countdown)
    }
    return ()=>bc.close()
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
    <div className="relative min-h-[70vh]">
      {/* SCENA */}
      <div className="rounded-2xl overflow-hidden h-[55vh] relative"
        style={{ background: scene.image ? undefined : scene.color }}>
        {scene.image && <div className="absolute inset-0 bg-center bg-cover" style={{backgroundImage:`url(${scene.image})`}}/>}
        <div className="absolute inset-0 bg-black/35 flex items-end p-6">
          <div className="text-3xl font-semibold">{scene.title}</div>
        </div>
      </div>

      {/* BANNER */}
      {banner && (
        <div className="absolute left-1/2 -translate-x-1/2 top-4 bg-black/70 border border-zinc-700 px-4 py-2 rounded-xl text-lg">
          {banner}
        </div>
      )}

      {/* COUNTDOWN */}
      {countdown.running && (
        <div className="mt-4 flex items-center gap-3">
          <div className="text-sm text-zinc-400">{countdown.label || 'Timer'}</div>
          <div className="text-2xl font-mono">
            {formatMs(countdown.remainMs ?? countdown.totalMs)}
          </div>
        </div>
      )}

      {/* CLOCKS */}
      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
