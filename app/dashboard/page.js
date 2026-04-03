'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Play, CheckCircle, Lock } from 'lucide-react'

const supabase = createClient(
  'https://cfpjjkfqkapamaulgysh.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmcGpqa2Zxa2FwYW1hdWxneXNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMDI5ODEsImV4cCI6MjA5MDU3ODk4MX0.AGm7hdpOxUYOu6q9BWjWeFWB1oMcp4ap-Wc1F9o-CT0'
)

export default function TeacherDashboard() {
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [prompts, setPrompts] = useState([])
  const [submissions, setSubmissions] = useState([])

  const checkPassword = (e) => {
    e.preventDefault()
    if (password === 'LoneStarTeacher') setIsAuthenticated(true)
    else alert("Wrong password!")
  }

  useEffect(() => {
    if (isAuthenticated) loadData()
  }, [isAuthenticated])

  async function loadData() {
    const { data: pList } = await supabase.from('prompts').select('*').order('created_at', { ascending: false })
    setPrompts(pList || [])
    const { data: sList } = await supabase.from('student_submissions').select('*').order('created_at', { ascending: false })
    setSubmissions(sList || [])
  }

  const togglePrompt = async (id, currentStatus) => {
    // Turn off all prompts first
    await supabase.from('prompts').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000')
    // Set the selected one to the opposite of what it was
    await supabase.from('prompts').update({ is_active: !currentStatus }).eq('id', id)
    loadData()
  }

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
      <form onSubmit={checkPassword} className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-sm text-center">
        <Lock className="mx-auto mb-4 text-slate-300" size={40} />
        <h1 className="text-2xl font-bold mb-6">Teacher Office</h1>
        <input type="password" placeholder="Password" className="w-full p-4 border rounded-2xl mb-4 text-center" onChange={(e) => setPassword(e.target.value)} />
        <button className="w-full bg-slate-800 text-white p-4 rounded-2xl font-bold hover:bg-slate-700 transition-colors">Enter Dashboard</button>
      </form>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="bg-white p-8 rounded-3xl shadow-lg border">
          <h2 className="font-bold text-xs uppercase tracking-widest text-slate-400 mb-6">Classroom Prompts</h2>
          <div className="space-y-3">
            {prompts.map(p => (
              <div key={p.id} onClick={() => togglePrompt(p.id, p.is_active)} className={`p-5 rounded-2xl border cursor-pointer flex justify-between items-center transition-all ${p.is_active ? 'bg-blue-50 border-blue-400' : 'bg-white hover:bg-slate-50'}`}>
                <span className={`text-sm font-bold ${p.is_active ? 'text-blue-700' : 'text-slate-600'}`}>{p.prompt_text}</span>
                {p.is_active && <CheckCircle className="text-blue-500" size={24} />}
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white p-8 rounded-3xl shadow-lg border">
          <h2 className="font-bold text-xs uppercase tracking-widest text-slate-400 mb-6">Student Submissions ({submissions.length})</h2>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {submissions.map((s) => (
              <div key={s.id} className="p-5 bg-slate-50 rounded-2xl border flex justify-between items-center">
                <div>
                  <span className="font-black text-slate-800 block">{s.student_name}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-tighter italic">{s.prompt_text}</span>
                </div>
                <a href={`https://cfpjjkfqkapamaulgysh.supabase.co/storage/v1/object/public/${s.audio_path}`} target="_blank" className="p-3 bg-white rounded-full border shadow-sm text-blue-600 hover:scale-110 transition-transform">
                  <Play size={20} fill="currentColor" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
