'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Mic, CheckCircle, UploadCloud } from 'lucide-react'

export default function StudentPage() {
  const [assignment, setAssignment] = useState(null)
  const [status, setStatus] = useState('loading') // loading, idle, recording, success

  useEffect(() => {
    async function getTask() {
      const { data } = await supabase.from('assignments').select('*').limit(1).single()
      if (data) setAssignment(data)
      setStatus('idle')
    }
    getTask()
  }, [])

  if (status === 'loading') return <div className="p-20 text-center font-sans">Waking up the classroom...</div>

  const primaryColor = assignment?.theme_config?.primaryColor || '#3b82f6'

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
        
        {/* Header Decor */}
        <div className="h-3 w-full" style={{ backgroundColor: primaryColor }}></div>
        
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">
            {assignment?.title || "Weekly Speaking Practice"}
          </h1>
          
          <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-dashed border-slate-300">
            <p className="text-slate-600 italic text-lg leading-relaxed">
              "{assignment?.prompt_text || "Please wait for your teacher to post a prompt."}"
            </p>
          </div>

          {/* The Recorder Placeholder */}
          <div className="flex flex-col items-center gap-4">
            <button 
              className="w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg transition-all hover:scale-110 active:scale-95"
              style={{ backgroundColor: primaryColor }}
            >
              <Mic size={32} />
            </button>
            <p className="text-slate-400 font-medium text-sm tracking-wide uppercase">
              Tap to Record
            </p>
          </div>
        </div>
      </div>
      
      <p className="mt-8 text-slate-400 text-xs">Lone Star College ESL • Powered by Gemini & Supabase</p>
    </div>
  )
}
