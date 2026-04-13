'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { CheckCircle, Users, LayoutGrid, Trash2, RefreshCw } from 'lucide-react'

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

  const addStudent = async () => {
    await supabase.from('students').insert([{ full_name: newName, student_code: newCode }]);
    setNewName(''); setNewCode(''); loadData()
  }

  const toggleActive = async (id, status) => {
    await supabase.from('assignments').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('assignments').update({ is_active: !status }).eq('id', id)
    loadData()
  }

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-black">SYNCING LAB...</div>

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900 font-sans">
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-8">
        <h1 className="text-2xl font-black tracking-tighter text-blue-600 uppercase">Gemini Lab</h1>
        <button onClick={loadData} className="p-2 hover:bg-slate-200 rounded-full transition"><RefreshCw size={20} className="text-slate-400" /></button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-3 bg-white p-6 rounded-3xl shadow-xl">
           <h2 className="font-black text-[10px] uppercase text-slate-400 mb-6 tracking-widest">Roster</h2>
           <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name" className="w-full p-2 border rounded-xl mb-2 text-xs" />
           <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="Code" className="w-full p-2 border rounded-xl mb-4 text-xs" />
           <button onClick={addStudent} className="w-full bg-blue-600 text-white p-2 rounded-xl font-bold text-xs uppercase mb-6">Add</button>
           {roster.map(s => <div key={s.id} className="p-2 border-b text-[10px] font-bold">{s.full_name} ({s.student_code})</div>)}
        </div>
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl shadow-xl">
           <h2 className="font-black text-[10px] uppercase text-slate-400 mb-6 tracking-widest">Active Tasks</h2>
           <textarea value={newTask} onChange={e => setNewTask(e.target.value)} className="w-full p-3 border rounded-xl text-xs mb-3 h-20" placeholder="New task..." />
           <button onClick={async () => { await supabase.from('assignments').insert([{ prompt_text: newTask }]); setNewTask(''); loadData() }} className="w-full bg-blue-600 text-white p-3 rounded-xl font-black text-[10px] uppercase mb-6">Save</button>
           {prompts.map(p => (
             <div key={p.id} className="p-4 border rounded-2xl flex justify-between items-center mb-2">
               <p className="text-xs font-bold leading-tight">{p.prompt_text}</p>
               <button onClick={() => toggleActive(p.id, p.is_active)}><CheckCircle size={20} className={p.is_active ? "text-green-500" : "text-slate-200"} /></button>
             </div>
           ))}
        </div>
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl shadow-xl min-h-[500px]">
          <h2 className="font-black text-[10px] uppercase text-slate-400 mb-6 tracking-widest">Submissions</h2>
          {submissions.map(sub => (
            <div key={sub.id} className="p-4 border rounded-2xl bg-slate-50 mb-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-black uppercase">{sub.students?.full_name}</p>
                {sub.ai_score && <span className="bg-blue-600 text-white px-2 py-1 rounded-lg text-[10px] font-black">AI: {sub.ai_score}/5</span>}
              </div>
              <p className="text-[10px] text-slate-500 italic mb-3 leading-relaxed">"{sub.transcript || 'Processing AI Feedback...'}"</p>
              <audio controls src={sub.audio_url} className="w-full h-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}