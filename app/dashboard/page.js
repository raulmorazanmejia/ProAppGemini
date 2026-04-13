'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { CheckCircle, Users, LayoutGrid, Trash2, RefreshCw, MessageSquare } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function TeacherDashboard() {
  const [prompts, setPrompts] = useState([]); const [submissions, setSubmissions] = useState([]);
  const [roster, setRoster] = useState([]); const [newTask, setNewTask] = useState('');
  const [newName, setNewName] = useState(''); const [newCode, setNewCode] = useState('');
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: p } = await supabase.from('assignments').select('*').order('created_at', { ascending: false })
    const { data: s } = await supabase.from('submissions').select('*, students(full_name), assignments(prompt_text)').order('created_at', { ascending: false })
    const { data: r } = await supabase.from('students').select('*').order('full_name', { ascending: true })
    setPrompts(p || []); setSubmissions(s || []); setRoster(r || []); setLoading(false)
  }

  const toggleActive = async (id, status) => {
    await supabase.from('assignments').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('assignments').update({ is_active: !status }).eq('id', id)
    loadData()
  }

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-black tracking-widest">GEMINI LAB SYNCING...</div>

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900 font-sans">
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-12">
        <h1 className="text-3xl font-black tracking-tighter text-blue-600 italic">GEMINI LAB.</h1>
        <button onClick={loadData} className="p-3 bg-white shadow-sm hover:bg-slate-100 rounded-full transition"><RefreshCw size={20} className="text-blue-600" /></button>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ROSTER */}
        <div className="lg:col-span-3">
          <div className="bg-white p-6 rounded-[32px] shadow-xl border border-slate-100">
            <h2 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2"><Users size={14}/> Roster</h2>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full Name" className="w-full p-3 border rounded-xl mb-2 text-xs font-bold" />
            <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="Code" className="w-full p-3 border rounded-xl mb-4 text-xs font-bold" />
            <button onClick={async () => { await supabase.from('students').insert([{ full_name: newName, student_code: newCode }]); setNewName(''); setNewCode(''); loadData() }} className="w-full bg-blue-600 text-white p-3 rounded-xl font-black text-[10px] uppercase tracking-widest mb-6">Add Student</button>
            <div className="space-y-2">{roster.map(s => <div key={s.id} className="p-3 bg-slate-50 rounded-xl text-[10px] font-black flex justify-between">{s.full_name} <span className="text-blue-400">{s.student_code}</span></div>)}</div>
          </div>
        </div>

        {/* TASKS */}
        <div className="lg:col-span-4">
          <div className="bg-white p-6 rounded-[32px] shadow-xl border border-slate-100">
            <h2 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2"><LayoutGrid size={14}/> Active Assignment</h2>
            <textarea value={newTask} onChange={e => setNewTask(e.target.value)} className="w-full p-4 border rounded-2xl text-xs mb-3 h-24 font-bold" placeholder="Example: Describe your favorite restaurant in Houston..." />
            <button onClick={async () => { await supabase.from('assignments').insert([{ prompt_text: newTask }]); setNewTask(''); loadData() }} className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest mb-8">Deploy Task</button>
            {prompts.map(p => (
              <div key={p.id} className="p-4 border rounded-2xl flex justify-between items-center mb-3">
                <p className="text-xs font-bold leading-tight max-w-[80%]">{p.prompt_text}</p>
                <button onClick={() => toggleActive(p.id, p.is_active)}><CheckCircle size={24} className={p.is_active ? "text-green-500" : "text-slate-100"} /></button>
              </div>
            ))}
          </div>
        </div>

        {/* SUBMISSIONS */}
        <div className="lg:col-span-5">
          <div className="bg-white p-6 rounded-[32px] shadow-xl border border-slate-100 min-h-[600px]">
            <h2 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2"><MessageSquare size={14}/> Submissions</h2>
            {submissions.map(sub => (
              <div key={sub.id} className="p-6 border rounded-[32px] bg-slate-50 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm font-black uppercase text-blue-600">{sub.students?.full_name}</p>
                  <span className="bg-blue-600 text-white px-3 py-1 rounded-xl text-[10px] font-black tracking-widest">AI: {sub.ai_score}/5</span>
                </div>
                <div className="space-y-4 mb-4">
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-50">
                    <p className="text-[10px] font-black uppercase text-blue-400 mb-1">Feedback</p>
                    <p className="text-xs font-bold text-slate-700 leading-tight">"{sub.teacher_score || 'AI is thinking...'}"</p>
                  </div>
                  <div className="p-2">
                    <p className="text-[10px] font-black uppercase text-slate-300 mb-1">Transcript</p>
                    <p className="text-[10px] text-slate-400 italic">"{sub.transcript}"</p>
                  </div>
                </div>
                <audio controls src={sub.audio_url} className="w-full h-8" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}