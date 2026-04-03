'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Settings, Play, Save, Users, Lock, RefreshCw } from 'lucide-react'

export default function TeacherDashboard() {
  // --- AUTH STATES ---
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  // --- CONTENT STATES ---
  const [prompt, setPrompt] = useState('')
  const [title, setTitle] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(false)

  // --- THE PASSWORD (Change this anytime) ---
  const SECRET_PASSWORD = 'LoneStarTeacher' 

  const checkPassword = (e) => {
    e.preventDefault()
    if (password === SECRET_PASSWORD) {
      setIsAuthenticated(true)
    } else {
      alert("Wrong password, lad. Try again.")
    }
  }

  // Load current settings and submissions once logged in
  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated])

  async function loadData() {
    setLoading(true)
    // 1. Get the current assignment settings
    const { data: assign } = await supabase.from('assignments').select('*').limit(1).maybeSingle()
    if (assign) {
      setTitle(assign.title)
      setPrompt(assign.prompt_text)
      setColor(assign.theme_config?.primaryColor || '#3b82f6')
    }

    // 2. Get the student submissions
    const { data: subs } = await supabase.from('submissions').select('*').order('created_at', { ascending: false })
    setSubmissions(subs || [])
    setLoading(false)
  }

  const handleUpdate = async () => {
    // Find the ID of the existing assignment so we can overwrite it
    const { data: existing } = await supabase.from('assignments').select('id').limit(1).maybeSingle()

    const payload = {
      title,
      prompt_text: prompt,
      theme_config: { primaryColor: color },
      is_active: true
    }

    // If a record already exists, we include its ID so Supabase knows to UPDATE instead of INSERT
    if (existing) {
      payload.id = existing.id
    }

    const { error } = await supabase.from('assignments').upsert(payload)

    if (error) {
      alert("Error saving to database: " + error.message)
    } else {
      alert("Classroom Updated! Your students will see the new prompt now.")
      loadData() // Refresh the dashboard view
    }
  }

  // --- 1. LOGIN SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <form onSubmit={checkPassword} className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="text-slate-400" size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-slate-800">Teacher Office</h1>
          <p className="text-slate-500 mb-6 text-sm">Enter your password to manage the class.</p>
          <input 
            type="password" 
            placeholder="Password"
            className="w-full p-3 border rounded-xl mb-4 text-center outline-none focus:ring-2 ring-slate-400 transition-all"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="w-full bg-slate-800 text-white p-3 rounded-xl font-bold hover:bg-slate-700 transition-colors">
            Unlock Dashboard
          </button>
        </form>
      </div>
    )
  }

  // --- 2. THE ACTUAL DASHBOARD ---
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Teacher Dashboard</h1>
            <p className="text-slate-500">Manage prompts and review student recordings.</p>
          </div>
          <button onClick={loadData} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <RefreshCw size={24} className={loading ? 'animate-spin' : ''} />
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Classroom Control */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h2 className="flex items-center gap-2 font-bold text-lg mb-6">
                <Settings size={20} className="text-slate-400" /> Classroom Settings
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Task Title</label>
                  <input 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    placeholder="e.g., Job Skills"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-blue-500/20 transition-all" 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">The Prompt</label>
                  <textarea 
                    value={prompt} 
                    onChange={(e) => setPrompt(e.target.value)} 
                    placeholder="Describe your skills..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-blue-500/20 transition-all" 
                    rows="4" 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Theme Color</label>
                  <div className="flex gap-3 items-center">
                    <input 
                      type="color" 
                      value={color} 
                      onChange={(e) => setColor(e.target.value)} 
                      className="w-12 h-12 rounded-lg cursor-pointer border-0" 
                    />
                    <div className="text-xs text-slate-400 font-mono uppercase">{color}</div>
                  </div>
                </div>

                <button 
                  onClick={handleUpdate} 
                  className="w-full bg-slate-900 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 shadow-lg shadow-slate-900/10 transition-all active:scale-95 mt-4"
                >
                  <Save size={18} /> Push to Students
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Student Submissions */}
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 min-h-[500px]">
              <h2 className="flex items-center gap-2 font-bold text-lg mb-6">
                <Users size={20} className="text-slate-400" /> 
                Student Submissions 
                <span className="ml-2 bg-slate-100 text-slate-500 text-xs py-1 px-2 rounded-full">{submissions.length}</span>
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {submissions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-300 transition-all group">
                    <div className="truncate pr-4">
                      <p className="font-bold text-slate-800 truncate">{s.student_name}</p>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">
                        {new Date(s.created_at).toLocaleDateString()} at {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <a 
                      href={`https://twtlrehxjmduihfgmvul.supabase.co/storage/v1/object/public/recordings/${s.audio_path}`}
                      target="_blank"
                      className="w-12 h-12 flex-shrink-0 bg-white rounded-full shadow-sm border border-slate-200 flex items-center justify-center text-slate-600 hover:text-blue-600 hover:shadow-md transition-all"
                    >
                      <Play size={20} fill="currentColor" className="ml-1" />
                    </a>
                  </div>
                ))}

                {submissions.length === 0 && !loading && (
                  <div className="col-span-full py-20 text-center">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-300">
                       <Users className="text-slate-300" />
                    </div>
                    <p className="text-slate-400 font-medium italic">No recordings yet. Tell the class to start talking!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
      <footer className="mt-12 text-center text-[10px] text-slate-300 uppercase tracking-[0.2em] font-bold">
        Secure Teacher Portal &bull; Lone Star ESL
      </footer>
    </div>
  )
}
