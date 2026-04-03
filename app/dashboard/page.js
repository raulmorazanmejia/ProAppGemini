'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Settings, Play, Save, Users, Lock } from 'lucide-react'

export default function TeacherDashboard() {
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  const [prompt, setPrompt] = useState('')
  const [title, setTitle] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [submissions, setSubmissions] = useState([])

  // --- THE PASSWORD ---
  const SECRET_PASSWORD = 'LoneStarTeacher' // <--- CHANGE THIS TO WHATEVER YOU WANT

  const checkPassword = (e) => {
    e.preventDefault()
    if (password === SECRET_PASSWORD) {
      setIsAuthenticated(true)
    } else {
      alert("Wrong password, lad.")
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      async function loadData() {
        const { data: assign } = await supabase.from('assignments').select('*').limit(1).single()
        if (assign) {
          setTitle(assign.title)
          setPrompt(assign.prompt_text)
          setColor(assign.theme_config.primaryColor)
        }
        const { data: subs } = await supabase.from('submissions').select('*').order('created_at', { ascending: false })
        setSubmissions(subs || [])
      }
      loadData()
    }
  }, [isAuthenticated])

  const handleUpdate = async () => {
    const { data: existing } = await supabase.from('assignments').select('id').limit(1).single()
    const payload = {
      title,
      prompt_text: prompt,
      theme_config: { primaryColor: color },
      is_active: true
    }
    if (existing) {
      await supabase.from('assignments').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('assignments').insert([payload])
    }
    alert("Classroom Updated!")
  }

  // --- LOGIN SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <form onSubmit={checkPassword} className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center">
          <Lock className="mx-auto mb-4 text-slate-400" size={48} />
          <h1 className="text-2xl font-bold mb-6 text-slate-800">Teacher Login</h1>
          <input 
            type="password" 
            placeholder="Enter Password"
            className="w-full p-3 border rounded-xl mb-4 text-center outline-none focus:ring-2 ring-slate-400"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="w-full bg-slate-800 text-white p-3 rounded-xl font-bold hover:bg-slate-700">
            Enter Dashboard
          </button>
        </form>
      </div>
    )
  }

  // --- ACTUAL DASHBOARD ---
  return (
    <div className="min-h-screen bg-slate-100 p-8 font-sans">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <h2 className="flex items-center gap-2 font-bold text-lg mb-4 text-slate-700">
              <Settings size={20} /> Classroom Settings
            </h2>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Task Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 border rounded-lg mb-4" />
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">The Prompt</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="w-full p-2 border rounded-lg mb-4" rows="3" />
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Theme Color</label>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full h-10 rounded-lg cursor-pointer mb-6" />
            <button onClick={handleUpdate} className="w-full bg-slate-800 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-700">
              <Save size={18} /> Push to Students
            </button>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-2xl shadow-sm border min-h-[400px]">
            <h2 className="flex items-center gap-2 font-bold text-lg mb-6 text-slate-700">
              <Users size={20} /> Student Submissions ({submissions.length})
            </h2>
            <div className="space-y-4">
              {submissions.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border">
                  <div>
                    <p className="font-bold text-slate-800">{s.student_name}</p>
                    <p className="text-xs text-gray-400">{new Date(s.created_at).toLocaleString()}</p>
                  </div>
                  <a 
                    href={`https://twtlrehxjmduihfgmvul.supabase.co/storage/v1/object/public/recordings/${s.audio_path}`}
                    target="_blank"
                    className="p-3 bg-white rounded-full shadow-sm border hover:text-blue-600"
                  >
                    <Play size={20} fill="currentColor" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
