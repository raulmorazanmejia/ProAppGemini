'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Users, LayoutGrid, Trash2, RefreshCw, MessageSquare, Target, Send, Image as ImageIcon, School, PlusCircle, Star, CheckCircle2 } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function TeacherDashboard() {
  const [prompts, setPrompts] = useState([]); const [submissions, setSubmissions] = useState([]);
  const [roster, setRoster] = useState([]); const [newTask, setNewTask] = useState('');
  const [rubric, setRubric] = useState('general'); const [taskImage, setTaskImage] = useState(null);
  const [newStudent, setNewStudent] = useState({ full_name: '', student_code: '' });
  const [selectedClass, setSelectedClass] = useState('Alar Institute - Class A');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: p } = await supabase.from('assignments').select('*').order('created_at', { ascending: false })
    const { data: s } = await supabase.from('submissions').select('*, students(full_name, class_name), assignments(prompt_text, image_prompt_url, rubric_focus)').order('created_at', { ascending: false })
    const { data: r } = await supabase.from('students').select('*').order('full_name', { ascending: true })
    setPrompts(p || []); setSubmissions(s || []); setRoster(r || []); setLoading(false)
  }

  // 1. Requirement: Dropdown lists unique classes
  const classes = ['Alar Institute - Class A', ...new Set(roster.map(s => s.class_name).filter(c => c !== 'Alar Institute - Class A'))]

  const saveTask = async () => {
    let imageUrl = null
    if (taskImage) {
      const name = `prompt-${Date.now()}.png`
      await supabase.storage.from('assignment-images').upload(name, taskImage)
      imageUrl = supabase.storage.from('assignment-images').getPublicUrl(name).data.publicUrl
    }
    await supabase.from('assignments').insert([{ prompt_text: newTask, image_prompt_url: imageUrl, rubric_focus: rubric, is_active: false }])
    setNewTask(''); setTaskImage(null); loadData()
  }

  // 2. Requirement: Make Task Live (Fixes the "Still Locked" issue)
  const makeTaskLive = async (id) => {
    await supabase.from('assignments').update({ is_active: false }).neq('id', id)
    await supabase.from('assignments').update({ is_active: true }).eq('id', id)
    loadData()
  }

  const addStudent = async () => {
    // 3. Requirement: Auto-assign the selected class to new students
    await supabase.from('students').insert([{ ...newStudent, class_name: selectedClass }])
    setNewStudent({ full_name: '', student_code: '' })
    loadData()
  }

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-black tracking-widest">FLAIR PRO SYNCING...</div>

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-12">
        <h1 className="text-3xl font-black tracking-tighter text-blue-600 italic">Flair Pro Dashboard.</h1>
        <button onClick={loadData} className="p-3 bg-white shadow-sm hover:bg-slate-100 rounded-full transition"><RefreshCw size={20} className="text-blue-600" /></button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* NEW ASSIGNMENT */}
        <div className="xl:col-span-4 bg-white p-8 rounded-[40px] shadow-xl border border-slate-100 h-fit space-y-4">
          <h2 className="font-black text-[10px] uppercase tracking-widest text-blue-600 flex items-center gap-2"><Target size={14}/> Create Task</h2>
          <textarea value={newTask} onChange={e => setNewTask(e.target.value)} className="w-full p-4 border rounded-2xl h-24 text-sm font-bold bg-slate-50 border-slate-100" placeholder="Type prompt..." />
          <div className="flex gap-2">
            <select value={rubric} onChange={e => setRubric(e.target.value)} className="flex-grow p-3 bg-slate-100 rounded-xl text-xs font-bold border-none">
              <option value="general">General ESL</option>
              <option value="pronunciation">Pronunciation</option>
            </select>
            <input type="file" onChange={e => setTaskImage(e.target.files[0])} className="hidden" id="img-up" />
            <label htmlFor="img-up" className="p-3 bg-slate-900 text-white rounded-xl cursor-pointer"><ImageIcon size={16}/></label>
          </div>
          <button onClick={saveTask} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-widest">Save Assignment</button>
        </div>

        {/* ACTIVE TASKS LIST */}
        <div className="xl:col-span-8 bg-white p-8 rounded-[40px] shadow-lg border border-slate-50">
          <h2 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2"><LayoutGrid size={14}/> Assignment Manager</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prompts.map(p => (
              <div key={p.id} className={`p-6 rounded-[32px] border transition ${p.is_active ? 'bg-blue-600 text-white border-blue-700 shadow-lg' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex gap-4 mb-4">
                  {p.image_prompt_url && <img src={p.image_prompt_url} className="w-16 h-16 object-cover rounded-xl border-2 border-white shadow-sm" />}
                  <div>
                    <p className="text-xs font-bold line-clamp-2">{p.prompt_text}</p>
                    <p className={`text-[10px] font-black uppercase ${p.is_active ? 'text-blue-100' : 'text-slate-400'}`}>{p.rubric_focus}</p>
                  </div>
                </div>
                {!p.is_active ? (
                  <button onClick={() => makeTaskLive(p.id)} className="w-full bg-blue-600 text-white p-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-95 transition">Make Live</button>
                ) : (
                  <div className="w-full bg-white text-blue-600 p-3 rounded-xl font-black text-[10px] uppercase text-center flex items-center justify-center gap-2"><CheckCircle2 size={14}/> Current Task</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ROSTER FILTERING (Requirement from Screenshot) */}
        <div className="xl:col-span-12 bg-white p-8 rounded-[40px] shadow-xl border border-slate-100 mt-8">
          <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-6">
            <h2 className="font-black text-[10px] uppercase tracking-widest text-slate-400 flex items-center gap-2"><Users size={14}/> Class Roster</h2>
            <div className="flex items-center gap-3">
               <span className="text-[10px] font-black uppercase text-slate-300">Select Class:</span>
               <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="p-3 bg-slate-100 rounded-xl text-xs font-bold border-none">
                 {classes.map(c => <option key={c}>{c}</option>)}
               </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <input value={newStudent.full_name} onChange={e => setNewStudent({...newStudent, full_name: e.target.value})} placeholder="Full Name" className="p-4 bg-slate-50 border-none rounded-2xl font-bold text-xs" />
            <input value={newStudent.student_code} onChange={e => setNewStudent({...newStudent, student_code: e.target.value})} placeholder="Access Code" className="p-4 bg-slate-50 border-none rounded-2xl font-bold text-xs" />
            <button onClick={addStudent} className="bg-slate-900 text-white p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"><PlusCircle size={14}/> Add to {selectedClass.split(' - ')[1] || 'Class'}</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {roster.filter(s => s.class_name === selectedClass).map(s => (
              <div key={s.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                <span className="text-xs font-black uppercase text-slate-700">{s.full_name}</span>
                <span className="text-[10px] font-black text-blue-500 bg-white px-2 py-1 rounded-lg shadow-sm">{s.student_code}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
