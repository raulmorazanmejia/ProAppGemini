'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Play, Save, Lock } from 'lucide-react'

// THE ENGINE - HARDCODED DIRECTLY IN THE FILE
const supabase = createClient(
  'https://twtlrehxjmduihfgmvul.supabase.co', 
  'sb_publishable_z_0bdiRubPVFWXscS6P6jw_Nipjt_69656166316238322d366366342d346430342d613239632d393165306631613936663235'
)

export default function TeacherDashboard() {
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [submissions, setSubmissions] = useState([])

  const checkPassword = (e) => {
    e.preventDefault()
    if (password === 'LoneStarTeacher') setIsAuthenticated(true)
    else alert("Wrong password, lad.")
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
    const payload = { title: "Job Skills", prompt_text: prompt, is_active: true }
    if (existing) payload.id = existing.id
    const { error } = await supabase.from('assignments').upsert(payload)
    if (error) alert(error.message)
    else { alert("SUCCESS! Push finished."); loadData(); }
  }

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
      <form onSubmit={checkPassword} className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold mb-6">Teacher Office</h1>
        <input type="password" placeholder="Password" className="w-full p-4 border rounded-2xl mb-4 text-center" onChange={(e) => setPassword(e.target.value)} />
        <button className="w-full bg-slate-800 text-white p-4 rounded-2xl font-bold">Enter Dashboard</button>
      </form>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="bg-white p-10 rounded-3xl shadow-lg border">
          <h2 className="font-bold text-xs uppercase tracking-widest text-slate-400 mb-6">Classroom Settings</h2>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="w-full p-5 bg-slate-50 border rounded-2xl mb-6 font-medium" rows="5" />
          <button onClick={handleUpdate} className="w-full bg-slate-900 text-white p-5 rounded-2xl font-bold">PUSH TO STUDENTS</button>
        </div>
        <div className="bg-white p-10 rounded-3xl shadow-lg border">
          <h2 className="font-bold text-xs uppercase tracking-widest text-slate-400 mb-6">Submissions ({submissions.length})</h2>
          <div className="space-y-4">
            {submissions.map((s) => (
              <div key={s.id} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl border">
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
