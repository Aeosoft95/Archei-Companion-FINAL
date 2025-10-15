
'use client'
import { useEffect, useState } from 'react'
type Clock = { id:string, name:string, segments:number, fill:number, visible:boolean }
type Scene = { title?:string, color?:string, image?:string, visible?:boolean }
type CDown = { running:boolean, totalMs:number, remainMs:number, label?:string }
export default function DisplayLocal(){
  const [clocks, setClocks] = useState<Clock[]>([])
  const [scene, setScene] = useState<Scene>({ title:'', color:'#000', image:'', visible:true })
  const [banner, setBanner] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<CDown | null>(null)
  useEffect(()=>{
    const bc = new BroadcastChannel('archei-display')
    bc.onmessage = (ev)=>{
      const msg = ev.data
      if(msg.t==='DISPLAY_CLOCKS_STATE') setClocks(msg.clocks || [])
      if(msg.t==='DISPLAY_SCENE_STATE') setScene(msg.scene || {})
      if(msg.t==='DISPLAY_BANNER') { setBanner(msg.text); setTimeout(()=>setBanner(null), 4000) }
      if(msg.t==='DISPLAY_COUNTDOWN') setCountdown(msg.countdown || null)
    }
    return ()=> bc.close()
  }, [])
  return (
    <div className="relative min-h-screen" style={{background: scene?.image ? `url(${scene.image}) center/cover` : (scene?.color || '#000')}}>
      <div className="absolute inset-0 bg-black/40"/>
      {scene?.visible!==false && <div className="absolute top-4 left-4 text-3xl font-bold">{scene?.title}</div>}
      <div className="absolute bottom-6 left-6 right-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {clocks.map(c=>(
          <div key={c.id} className="bg-black/50 rounded-2xl p-3">
            <div className="text-sm text-zinc-300">{c.name}</div>
            <div className="mt-2 grid grid-cols-6 gap-1">{Array.from({length:c.segments}, (_,i)=>i<c.fill).map((on,i)=>(<div key={i} className={`h-2 rounded ${on?'bg-teal-400':'bg-zinc-700/70'}`}/>))}</div>
          </div>
        ))}
      </div>
      {banner && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/70 px-6 py-4 rounded-2xl text-xl">{banner}</div>}
      {countdown?.running && (
        <div className="absolute top-4 right-4 bg-black/60 px-4 py-2 rounded-xl">
          <div className="text-sm text-zinc-300">{countdown.label||'Timer'}</div>
          <div className="text-2xl font-bold">{Math.ceil((countdown.remainMs||0)/1000)}s</div>
        </div>
      )}
    </div>
  )
}
