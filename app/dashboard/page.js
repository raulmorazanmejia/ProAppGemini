'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { CheckCircle, Users, LayoutGrid, Trash2, Mic, Play, RefreshCw } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function TeacherDashboard() {
  const [prompts, setPrompts] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [roster, setRoster] = useState([])
  const [newTask, setNewTask] = useState('')
  const [newName, setNewName] = useState('')
  const [newCode, setNewCode] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: p } = await supabase.from('assignments').select('*').order('created_at', { ascending: false })
    const { data: s } = await supabase.from('submissions').select('*, students(full_name), assignments(prompt_text)').order('created_at', { ascending: false })
    const { data: r } = await supabase.from('students').select('*').order('full_name', { ascending: true })
    setPrompts(p || [])
    setSubmissions(s || [])
    setRoster(r || [])
    setLoading(false)
  }

  const addStudent = async () => {
    if (!newName || !newCode) return
    await supabase.from('students').insert([{ full_name: newName, student_code: newCode }])
    setNewName(''); setNewCode(''); loadData()
  }

  const deleteStudent = async (id) => {
    await supabase.from('students').delete().eq('id', id)
    loadData()
  }

  const addTask = async () => {
    if (!newTask) return
    await supabase.from('assignments').insert([{ prompt_text: newTask, is_active: false, platform: 'gemini' }])
    setNewTask(''); loadData()
  }

  const toggleActive = async (id, status) => {
    await supabase.from('assignments').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('assignments').update({ is_active: !status }).eq('id', id)
    loadData()
  }

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-black">RESTORING LAB...</div>

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-8">
        <h1 className="text-2xl font-black tracking-tighter text-blue-600">GEMINI LAB DASHBOARD</h1>
        <button onClick={loadData} className="p-2 hover:bg-slate-200 rounded-full transition"><RefreshCw size={20} className="text-slate-400" /></button>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ROSTER */}
        <div className="lg:col-span-3">
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100">
            <h2 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2"><Users size={14}/> Class Roster</h2>
            <div className="space-y-2 mb-6">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name" className="w-full p-2 border rounded-xl text-xs" />
              <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="Code" className="w-full p-2 border rounded-xl text-xs" />
              <button onClick={addStudent} className="w-full bg-blue-600 text-white p-2 rounded-xl font-bold text-xs uppercase tracking-widest">Add Student</button>
            </div>
            <div className="space-y-2">
              {roster.map(s => (
                <div key={s.id} className="p-3 border rounded-xl flex justify-between items-center group">
                  <p className="text-[10px] font-bold">{s.full_name} <span className="text-slate-300">({s.student_code})</span></p>
                  <button onClick={() => deleteStudent(s.id)} className="text-slate-200 hover:text-red-500"><Trash2 size={14}/></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TASKS */}
        <div className="lg:col-span-4">
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100">
            <h2 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2"><LayoutGrid size={14}/> Active Tasks</h2>
            <textarea value={newTask} onChange={e => setNewTask(e.target.value)} className="w-full p-3 border rounded-xl text-xs mb-3 h-20" placeholder="New prompt..." />
            <button onClick={addTask} className="w-full bg-blue-600 text-white p-3 rounded-xl font-black text-[10px] uppercase tracking-widest mb-6">Save to Project</button>
            <div className="space-y-3">
              {prompts.map(p => (
                <div key={p.id} className="p-4 border rounded-2xl flex justify-between items-center">
                  <p className="text-xs font-bold leading-tight max-w-[80%]">{p.prompt_text}</p>
                  <button onClick={() => toggleActive(p.id, p.is_active)}><CheckCircle size={20} className={p.is_active ? "text-green-500" : "text-slate-200"} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SUBMISSIONS */}
        <div className="lg:col-span-5">
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 min-h-[500px]">
            <h2 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-6">Student Submissions</h2>
            <div className="space-y-4">
              {submissions.map(sub => (
                <div key={sub.id} className="p-6 border rounded-3xl bg-slate-50 relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm"><Users size={16} className="text-slate-300"/></div>
                    <div>
                      <p className="text-xs font-black uppercase">{sub.students?.full_name}</p>
                      <p className="text-[10px] text-slate-400 italic">"{sub.assignments?.prompt_text}"</p>
                    </div>
                  </div>
                  <audio controls src={sub.audio_url} className="w-full mb-4 h-8" />
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}