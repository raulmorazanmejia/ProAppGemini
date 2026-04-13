'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function StudentPage() {
  const [assignment, setAssignment] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getActiveTask = async () => {
      const { data } = await supabase
        .from('assignments')
        .select('*')
        .eq('is_active', true)
        .single()
      setAssignment(data)
      setLoading(false)
    }
    getActiveTask()
  }, [])

  if (loading) return <div className="p-20 text-center font-bold">ENTERING LAB...</div>

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900">
      <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full text-center border border-slate-100">
        <h1 className="text-blue-600 font-black tracking-tighter mb-6">STUDENT LAB</h1>
        
        {!assignment ? (
          <p className="text-slate-400 font-bold italic uppercase text-xs">Waiting for teacher to post a task...</p>
        ) : (
          <div>
            <div className="bg-slate-50 p-6 rounded-2xl mb-6">
              <p className="text-sm font-bold text-slate-600">{assignment.prompt_text}</p>
            </div>
            {/* Audio Recording UI would go here */}
            <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest">Connection: Gemini Lab</p>
          </div>
        )}
      </div>
    </div>
  )
}