"use client"

import { Zap } from "lucide-react"
import { Orbitron } from "next/font/google"
import { UserButton } from "@clerk/nextjs"
import { useUser } from "@clerk/nextjs"

const orbitron = Orbitron({ subsets: ["latin"], weight: ["400", "700"] })

export default function Header() {
 

  return (
    <header className="border-b border-border bg-card h-16 flex items-center justify-between px-6 gap-3">
      <div className="flex items-center gap-3">
        <Zap className="w-5 h-5 text-primary" />
        <h1 className={`${orbitron.className} text-3xl font-extrabold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-transparent bg-clip-text`}>
          SmartSchema: AI-Powered Database Design Assistant
        </h1>
      </div>
     
    </header>
  )
}
