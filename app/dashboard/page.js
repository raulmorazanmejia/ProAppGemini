'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Settings, Play, Save, Users, Lock, RefreshCw, Trash2 } from 'lucide-react'

// DIRECT CONNECTION - No more "lib" folder needed
const supabaseUrl = 'https://twtlrehxjmduihfgmvul.supabase.co'
const supabaseAnonKey = 'sb_publishable_z_0bdiRubPVFWXscS6P6jw_Nipjt_...' // <--- PASTE YOUR FULL PUBLIC KEY HERE
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function TeacherDashboard() {
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [title, setTitle] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(false)

  const SECRET_PASSWORD = 'LoneStarTeacher' 

  const checkPassword = (e) => {
    e.preventDefault()
    if (password === SECRET_PASSWORD) setIsAuthenticated(true)
    else alert("Wrong password, lad.")
  }

  useEffect(() => {
    if (isAuthenticated) loadData()
  }, [isAuthenticated])

  async function loadData() {
    setLoading(true)
    const { data: assign } = await supabase.from('assignments').select('*').limit(1).maybeSingle()
    if (assign) {
      setTitle(assign.title)
      setPrompt(assign.prompt_text)
      setColor(assign.theme_config?.primaryColor || '#3b82f6')
    }
    const { data: subs } = await supabase.from('submissions').select('*').order('created_at', { ascending: false })
    setSubmissions(subs || [])
    setLoading(false)
  }

  const handleUpdate = async () => {
    setLoading(true)
    const { data: existing } = await supabase.from('assignments').select('id').limit(1).maybeSingle()
    const payload = {
      title: title || "New Task",
      prompt_text: prompt || "Record your response.",
      theme_config: { primaryColor: color },
      is_active: true
    }
    if (existing) payload.id = existing.id
    const { error } = await supabase.from('assignments').upsert(payload)
    if (error) alert("Error: " + error.message)
    else { alert("SUCCESS!"); loadData(); }
    setLoading(false)
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <form onSubmit={checkPassword} className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-6 text-center">Teacher Login</h1>
          <input type="password" placeholder="Password" className="w-full p-4 border rounded-2xl mb-4 text-center" onChange={(e) => setPassword(e.target.value)} />
          <button className="w-full bg-slate-800 text-white p-4 rounded-2xl font-bold">Unlock</button>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-10">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1 bg-white p-8 rounded-[2rem] shadow-xl border">
          <h2 className="font-bold mb-6">Classroom Settings</h2>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl mb-4" placeholder="Title" />
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl mb-4" rows="5" placeholder="Prompt" />
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full h-12 mb-6" />
          <button onClick={handleUpdate} className="w-full bg-slate-900 text-white p-5 rounded-2xl font-bold uppercase">{loading ? 'Saving...' : 'Push to Students'}</button>
        </div>
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] shadow-xl border">
          <h2 className="font-bold mb-6 uppercase tracking-widest text-xs text-slate-400">Submissions ({submissions.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {submissions.map((s) => (
              <div key={s.id} className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center">
                <span className="font-bold">{s.student_name}</span>
                <a href={`https://twtlrehxjmduihfgmvul.supabase.co/storage/v1/object/public/recordings/${s.audio_path}`} target="_blank" className="p-3 bg-white rounded-full border shadow-sm"><Play size={20} fill="currentColor" /></a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
