
'use client'
import { useEffect, useState } from 'react'
import DicePreview from '@/components/DicePreview'
import { archeiRoll } from '@shared/dice'
type Msg = { nick:string, text:string, ts:number }
export default function ChatPage(){
  const [wsUrl, setWsUrl] = useState(process.env.NEXT_PUBLIC_WS_DEFAULT || 'ws://localhost:8787')
  const [room, setRoom] = useState(process.env.NEXT_PUBLIC_ROOM_DEFAULT || 'demo')
  const [nick, setNick] = useState('')
  const [socket, setSocket] = useState<WebSocket|null>(null)
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [total, setTotal] = useState(5)
  const [real, setReal] = useState(5)
  const [last, setLast] = useState<any>(null)
  useEffect(()=>{ setNick(localStorage.getItem('archei:nick') || 'GM') }, [])
  function connect(){
    const ws = new WebSocket(wsUrl + `?room=${encodeURIComponent(room)}`)
    ws.onopen = ()=>{ setConnected(true); ws.send(JSON.stringify({ t:'join', room, nick, role:'gm' })); ws.send(JSON.stringify({ t:'chat:join', room, nick })) }
    ws.onmessage = (ev)=>{ try{ const msg = JSON.parse(ev.data); if(msg.t==='chat:msg') setMessages(m=>[...m,{nick:msg.nick,text:msg.text,ts:msg.ts}]) }catch{} }
    ws.onclose = ()=> setConnected(false)
    setSocket(ws)
  }
  function send(text:string){ if(socket) socket.send(JSON.stringify({ t:'chat:msg', room, nick, text, ts: Date.now(), channel:'global' })) }
  function roll(){ const res = archeiRoll(total, real); setLast(res); send(`Tiro ARCHEI — tot:${res.totalDice}, reali:${res.realDice}, soglia:${res.threshold}, tiri:[${res.rolls.join(',')}], successi:${res.successes}${res.fiveOfFive?' (CRITICO 5/5)':''}`) }
  return (
    <div className="grid md:grid-cols-3 gap-4">
      <div className="card space-y-3">
        <div className="label">WS URL</div><input className="input" value={wsUrl} onChange={e=>setWsUrl(e.target.value)} />
        <div className="label">Room</div><input className="input" value={room} onChange={e=>setRoom(e.target.value)} />
        <div className="label">Nick</div><input className="input" value={nick} onChange={e=>setNick(e.target.value)} />
        <button className="btn" onClick={connect}>{connected?'Riconnetti':'Connettiti'}</button>
        <div className="border-t border-zinc-800 pt-3 space-y-2">
          <div className="font-semibold">Tiradadi ARCHEI</div>
          <div className="label">Dadi totali (teorici)</div><input className="input" type="number" value={total} onChange={e=>setTotal(parseInt(e.target.value||'0'))}/>
          <div className="label">Dadi reali (max 5)</div><input className="input" type="number" value={real} onChange={e=>setReal(parseInt(e.target.value||'0'))}/>
          <button className="btn" onClick={roll}>Lancia</button>
          {last && (<div className="space-y-2"><div className="text-sm text-zinc-400">Soglia: {last.threshold} • Successi: <span className="text-green-400">{last.successes}</span></div><DicePreview rolls={last.rolls} threshold={last.threshold} /></div>)}
        </div>
      </div>
      <div className="md:col-span-2 card flex flex-col">
        <div className="flex-1 overflow-auto space-y-2">
          {messages.map((m,i)=>(<div key={i} className="bg-zinc-900/50 rounded-xl px-3 py-2"><span className="text-teal-400">{m.nick}:</span> {m.text}</div>))}
        </div>
        <ChatInput onSend={txt=>send(txt)} />
      </div>
    </div>
  )
}
function ChatInput({ onSend }:{ onSend:(txt:string)=>void }){
  const [txt,setTxt] = useState('')
  return (<div className="mt-3 flex gap-2"><input className="input" value={txt} onChange={e=>setTxt(e.target.value)} placeholder="Scrivi..."/><button className="btn" onClick={()=>{ if(txt.trim()) onSend(txt); setTxt('') }}>Invia</button></div>)
}
