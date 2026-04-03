'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Settings, Play, Mic, Save, Users } from 'lucide-react'

export default function TeacherDashboard() {
  const [prompt, setPrompt] = useState('')
  const [title, setTitle] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [submissions, setSubmissions] = useState([])

  // Load current settings and submissions
  useEffect(() => {
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
  }, [])

  const handleUpdate = async () => {
    // This will either update the first row or create it if empty
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
    window.location.reload() // Refresh to show changes
  }

  return (
    <div className="min-h-screen bg-slate-100 p-8 font-sans">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: Controls */}
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

        {/* Right Column: Submissions */}
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
                    className="p-3 bg-white rounded-full shadow-sm border hover:text-blue-600 transition-colors"
                  >
                    <Play size={20} fill="currentColor" />
                  </a>
                </div>
              ))}
              {submissions.length === 0 && <p className="text-center text-gray-400 py-10">No recordings yet. Share the link with your students!</p>}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
