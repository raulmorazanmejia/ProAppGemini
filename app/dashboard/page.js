'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Play, Save } from 'lucide-react'

const supabase = createClient('https://twtlrehxjmduihfgmvul.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dGxyZWh4am1kdWxoZmdtdnVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNzczMjMsImV4cCI6MjA5MDc1MzMyM30.lRmfe4N2PKX4Q0lJ-_fG9tUAb9Bh-r3Nr-G_diuu8OU')

export default function TeacherDashboard() {
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [submissions, setSubmissions] = useState([])

  const checkPassword = (e) => {
    e.preventDefault()
    if (password === 'LoneStarTeacher') setIsAuthenticated(true)
    else alert("Wrong password.")
  }

  useEffect(() => {
    if (isAuthenticated) loadData()
  }, [isAuthenticated])

  async function loadData() {
    const { data: assign } = await supabase.from('assignments').select('*').limit(1).maybeSingle()
    if (assign) setPrompt(assign.prompt_text)
    const { data: subs } = await supabase.from('submissions').select('*').order('created_at', { ascending: false })
    setSubmissions(subs || [])
  }

  const handleUpdate = async () => {
    const { data: existing } = await supabase.from('assignments').select('id').limit(1).maybeSingle()
    const payload = { title: "Speaking Task", prompt_text: prompt, is_active: true }
    if (existing) payload.id = existing.id
    await supabase.from('assignments').upsert(payload)
    alert("Updated!")
    loadData()
  }

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center font-sans">
      <form onSubmit={checkPassword} className="bg-white p-8 rounded-2xl shadow-xl w-80 text-center">
        <h1 className="text-xl font-bold mb-4">Teacher Login</h1>
        <input type="password" placeholder="Password" className="w-full p-2 border rounded-xl mb-4 text-center" onChange={(e) => setPassword(e.target.value)} />
        <button className="w-full bg-slate-800 text-white p-2 rounded-xl">Enter</button>
      </form>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 p-10 font-sans">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="bg-white p-8 rounded-3xl shadow-lg border">
          <h2 className="font-bold mb-4">Set Prompt</h2>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl mb-4" rows="4" />
          <button onClick={handleUpdate} className="w-full bg-slate-900 text-white p-3 rounded-xl font-bold">PUSH TO STUDENTS</button>
        </div>
        <div className="bg-white p-8 rounded-3xl shadow-lg border">
          <h2 className="font-bold mb-4">Submissions ({submissions.length})</h2>
          {submissions.map((s) => (
            <div key={s.id} className="flex justify-between items-center p-3 border-b">
              <span>{s.student_name}</span>
              <a href={`https://twtlrehxjmduihfgmvul.supabase.co/storage/v1/object/public/recordings/${s.audio_path}`} target="_blank" className="text-blue-600"><Play size={20}/></a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
