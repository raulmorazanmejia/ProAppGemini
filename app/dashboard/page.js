'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Settings, Play, Save, Users, Lock, RefreshCw, Trash2 } from 'lucide-react'

export default function TeacherDashboard() {
  // --- AUTH ---
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  // --- DATA ---
  const [prompt, setPrompt] = useState('')
  const [title, setTitle] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(false)

  // --- PASSWORD (Change this anytime) ---
  const SECRET_PASSWORD = 'LoneStarTeacher' 

  const checkPassword = (e) => {
    e.preventDefault()
    if (password === SECRET_PASSWORD) {
      setIsAuthenticated(true)
    } else {
      alert("Wrong password, lad. Try again.")
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated])

  async function loadData() {
    setLoading(true)
    // 1. Get the current assignment
    const { data: assign, error: assignError } = await supabase
      .from('assignments')
      .select('*')
      .limit(1)
      .maybeSingle()
    
    if (assign) {
      setTitle(assign.title)
      setPrompt(assign.prompt_text)
      setColor(assign.theme_config?.primaryColor || '#3b82f6')
    }

    // 2. Get submissions
    const { data: subs, error: subsError } = await supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false })
    
    setSubmissions(subs || [])
    setLoading(false)
  }

  const handleUpdate = async () => {
    setLoading(true)
    // Find if an assignment already exists to get its ID
    const { data: existing } = await supabase
      .from('assignments')
      .select('id')
      .limit(1)
      .maybeSingle()

    const payload = {
      title: title || "New Speaking Task",
      prompt_text: prompt || "Please record your response.",
      theme_config: { primaryColor: color },
      is_active: true
    }

    // If it exists, we overwrite that specific one
    if (existing) {
      payload.id = existing.id
    }

    const { error } = await supabase.from('assignments').upsert(payload)

    if (error) {
      alert("Database Error: " + error.message)
    } else {
      alert("SUCCESS: Class updated! Go check the student page.")
      loadData()
    }
    setLoading(false)
  }

  const deleteSubmission = async (id) => {
    if (!confirm("Are you sure you want to delete this recording?")) return
    const { error } = await supabase.from('submissions').delete().eq('id', id)
    if (!error) loadData()
  }

  // --- LOGIN VIEW ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
        <form onSubmit={checkPassword} className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-slate-800">Teacher Office</h1>
          <p className="text-slate-500 mb-6 text-sm">Enter password to manage class</p>
          <input 
            type="password" 
            placeholder="Password"
            className="w-full p-4 border rounded-2xl mb-4 text-center outline-none focus:ring-2 ring-slate-300 font-bold"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="w-full bg-slate-800 text-white p-4 rounded-2xl font-bold hover:bg-slate-700 transition-all active:scale-95">
            Unlock Dashboard
          </button>
        </form>
      </div>
    )
  }

  // --- DASHBOARD VIEW ---
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase">Dashboard</h1>
            <p className="text-slate-500 font-medium">Control your ESL Classroom</p>
          </div>
          <button onClick={loadData} className="p-3 bg-white rounded-full shadow-sm border hover:shadow-md transition-all active:rotate-180 duration-500">
            <RefreshCw size={24} className={loading ? 'animate-spin text-blue-500' : 'text-slate-400'} />
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Left: Settings */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white">
              <h2 className="flex items-center gap-2 font-black text-xs uppercase tracking-[0.2em] mb-8 text-slate-400">
                <Settings size={16} /> Classroom Settings
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Task Title</label>
                  <input 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    placeholder="e.g., Oral Comm 1"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 ring-blue-500/10 font-bold" 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">The Prompt</label>
                  <textarea 
                    value={prompt} 
                    onChange={(e) => setPrompt(e.target.value)} 
                    placeholder="Describe your goals..."
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 ring-blue-500/10 font-medium leading-relaxed" 
                    rows="5" 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Theme Color</label>
                  <div className="flex gap-4 items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <input 
                      type="color" 
                      value={color} 
                      onChange={(e) => setColor(e.target.value)} 
                      className="w-12 h-12 rounded-xl cursor-pointer border-0 bg-transparent" 
                    />
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase">{color}</span>
                  </div>
                </div>

                <button 
                  onClick={handleUpdate} 
                  disabled={loading}
                  className="w-full bg-slate-900 text-white p-5 rounded-[1.5rem] font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 hover:bg-black shadow-2xl shadow-slate-900/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Save size={20} /> {loading ? 'Saving...' : 'Push to Students'}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Submissions */}
          <div className="lg:col-span-2">
            <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white min-h-[600px]">
              <h2 className="flex items-center gap-2 font-black text-xs uppercase tracking-[0.2em] mb-8 text-slate-400">
                <Users size={16} /> Student Submissions 
                <span className="ml-2 bg-blue-50 text-blue-500 py-1 px-3 rounded-full">{submissions.length}</span>
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {submissions.map((s) => (
                  <div key={s.id} className="group relative bg-slate-50 p-5 rounded-3xl border border-slate-100 hover:border-blue-200 hover:bg-white transition-all hover:shadow-lg">
                    <div className="mb-4">
                      <p className="font-black text-slate-800 text-lg leading-none mb-1">{s.student_name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {new Date(s.created_at).toLocaleDateString()} &bull; {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <a 
                        href={`https://twtlrehxjmduihfgmvul.supabase.co/storage/v1/object/public/recordings/${s.audio_path}`}
                        target="_blank"
                        className="flex-1 h-12 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center text-slate-600 hover:text-blue-600 hover:border-blue-600 transition-all"
                      >
                        <Play size={20} fill="currentColor" className="mr-2" />
                        <span className="text-xs font-bold uppercase tracking-widest">Listen</span>
                      </a>
                      <button 
                        onClick={() => deleteSubmission(s.id)}
                        className="w-12 h-12 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}

                {submissions.length === 0 && !loading && (
                  <div className="col-span-full py-32 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-dashed border-slate-200 text-slate-200">
                       <Users size={32} />
                    </div>
                    <p className="text-slate-300 font-black uppercase tracking-widest text-xs">No Recordings Found</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
