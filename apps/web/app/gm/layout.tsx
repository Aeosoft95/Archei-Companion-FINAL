'use client'
import { useEffect, useState } from 'react'
import SideNav from '@/components/SideNav'
import BackBar from '@/components/BackBar'

export default function GmLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true)

  useEffect(() => {
    const role = localStorage.getItem('archei:role')
    if (role !== 'gm') window.location.href = '/'
  }, [])

  return (
    <div className="flex min-h-screen">
      <aside className={`bg-zinc-950/60 border-r border-zinc-800 p-4 w-64 ${open ? '' : 'hidden md:block'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-xl font-semibold">Menu</div>
          <button className="btn !bg-zinc-800" onClick={() => setOpen(!open)}>☰</button>
        </div>
        <SideNav />
      </aside>

      <div className="flex-1">
        <BackBar title="ARCHEI Companion — GM" />
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
