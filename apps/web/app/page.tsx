
'use client'
import { useEffect, useState } from 'react'
export default function Home() {
  const [nick, setNick] = useState('')
  const [role, setRole] = useState<'gm'|'player'>('gm')
  useEffect(()=>{ setNick(localStorage.getItem('archei:nick') || 'GM'); setRole((localStorage.getItem('archei:role') as any) || 'gm') }, [])
  function login(){ localStorage.setItem('archei:nick', nick || 'GM'); localStorage.setItem('archei:role', role); location.href = '/tools/chat' }
  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">ARCHEI Companion</h1>
      <div className="card space-y-3">
        <div className="label">Nick</div><input className="input" value={nick} onChange={e=>setNick(e.target.value)} />
        <div className="label">Ruolo</div>
        <div className="flex gap-2">
          <button className={`btn ${role==='gm'?'!bg-teal-500':''}`} onClick={()=>setRole('gm')}>GM</button>
          <button className={`btn ${role==='player'?'!bg-teal-500':''}`} onClick={()=>setRole('player')}>Player</button>
        </div>
        <button className="btn" onClick={login}>Entra</button>
      </div>
    </main>
  )
}
