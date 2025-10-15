
'use client'
import Link from 'next/link'
import { useState } from 'react'
export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="flex min-h-screen">
      <aside className={`bg-zinc-950/60 border-r border-zinc-800 p-4 w-64 ${open?'':'hidden md:block'}`}>
        <div className="text-xl font-semibold mb-4">Tools</div>
        <nav className="flex flex-col gap-2">
          <Link href="/" className="btn !bg-zinc-800">Dashboard</Link>
          <Link href="/tools/chat" className="btn">Chat</Link>
          <Link href="/tools/scene" className="btn">Scene</Link>
          <Link href="/tools/clock" className="btn">Clock</Link>
          <Link href="/display" className="btn !bg-zinc-700">Display (locale)</Link>
          <Link href="/display-online" className="btn !bg-zinc-700">Display (online)</Link>
        </nav>
      </aside>
      <div className="flex-1">
        <div className="border-b border-zinc-800 p-3 flex items-center gap-2">
          <button className="btn !bg-zinc-800" onClick={()=>setOpen(!open)}>☰</button>
          <div className="text-zinc-300">ARCHEI Companion</div>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
