'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Users, LayoutGrid, RefreshCw, MessageSquare, Target, Send, Image as ImageIcon, School, PlusCircle, CheckCircle2, Trash2, Settings } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function TeacherDashboard() {
  const [prompts, setPrompts] = useState([]); const [submissions, setSubmissions] = useState([]);
  const [roster, setRoster] = useState([]); const [classes, setClasses] = useState([]);
  const [newTask, setNewTask] = useState(''); const [rubric, setRubric] = useState('general');
  const [taskImage, setTaskImage] = useState(null); const [newStudent, setNewStudent] = useState({ full_name: '', student_code: '' });
  const [selectedClassName, setSelectedClassName] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: c } = await supabase.from('classes').select('*').order('name')
    const { data: p } = await supabase.from('assignments').select('*').order('created_at', { ascending: false })
    const { data: s } = await supabase.from('submissions').select('*, students(full_name, class_name), assignments(prompt_text, image_prompt_url, rubric_focus)').order('created_at', { ascending: false })
    const { data: r } = await supabase.from('students').select('*').order('full_name')
    
    setClasses(c || []); setPrompts(p || []); setSubmissions(s || []); setRoster(r || [])
    if (c?.length > 0 && !selectedClassName) setSelectedClassName(c[0].name)
    setLoading(false)
  }

  const handleAddClass = async () => {
    if (!newClassName) return
    await supabase.from('classes').insert([{ name: newClassName }])
    setNewClassName(''); loadData()
  }

  const makeTaskLive = async (id) => {
    await supabase.from('assignments').update({ is_active: false }).neq('id', id)
    await supabase.from('assignments').update({ is_active: true }).eq('id', id)
    loadData()
  }

  const saveTask = async () => {
    let imageUrl = null
    if (taskImage) {
      const name = `img-${Date.now()}`
      const { data } = await supabase.storage.from('assignment-images').upload(name, taskImage)
      imageUrl = supabase.storage.from('assignment-images').getPublicUrl(name).data.publicUrl
    }
    await supabase.from('assignments').insert([{ prompt_text: newTask, image_prompt_url: imageUrl, rubric_focus: rubric, is_active: false }])
    setNewTask(''); setTaskImage(null); loadData()
  }

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-black tracking-widest">FLAIR PRO LOADING...</div>

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-12">
        <h1 className="text-3xl font-black tracking-tighter text-blue-600 italic">Flair Pro.</h1>
        <div className="flex gap-4">
          <input value={newClassName} onChange={e => setNewClassName(e.target.value)} placeholder="New Class Name..." className="p-3 rounded-xl border-none shadow-sm text-xs font-bold" />
          <button onClick={handleAddClass} className="bg-slate-900 text-white px-6 rounded-xl font-black text-[10px] uppercase">Add Class</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* TASK CREATOR */}
        <div className="xl:col-span-4 bg-white p-8 rounded-[40px] shadow-xl border border-slate-100 space-y-4 h-fit">
          <h2 className="font-black text-[10px] uppercase tracking-widest text-blue-600 flex items-center gap-2"><Target size={14}/> Create Visual Task</h2>
          <textarea value={newTask} onChange={e => setNewTask(e.target.value)} className="w-full p-4 border rounded-2xl h-24 text-sm font-bold bg-slate-50 border-none" placeholder="Describe this image..." />
          <div className="flex gap-2">
            <select value={rubric} onChange={e => setRubric(e.target.value)} className="flex-grow p-3 bg-slate-100 rounded-xl text-xs font-bold border-none">
              <option value="general">General ESL</option>
              <option value="pronunciation">Pronunciation</option>
            </select>
            <input type="file" onChange={e => setTaskImage(e.target.files[0])} className="hidden" id="img-up" />
            <label htmlFor="img-up" className="p-3 bg-slate-900 text-white rounded-xl cursor-pointer"><ImageIcon size={16}/></label>
          </div>
          <button onClick={saveTask} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-widest">Save Draft</button>
        </div>

        {/* TASK LIST */}
        <div className="xl:col-span-8 bg-white p-8 rounded-[40px] shadow-lg border border-slate-50">
          <h2 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2"><LayoutGrid size={14}/> Assignment Manager</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prompts.map(p => (
              <div key={p.id} className={`p-6 rounded-[32px] border transition ${p.is_active ? 'bg-blue-600 text-white border-blue-700' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex gap-4 mb-4">
                  {p.image_prompt_url && <img src={p.image_prompt_url} className="w-16 h-16 object-cover rounded-xl border-2 border-white shadow-sm" />}
                  <p className="text-xs font-bold line-clamp-2">{p.prompt_text}</p>
                </div>
                {!p.is_active ? (
                  <button onClick={() => makeTaskLive(p.id)} className="w-full bg-blue-600 text-white p-3 rounded-xl font-black text-[10px] uppercase">Make Live</button>
                ) : (
                  <div className="text-center font-black text-[10px] uppercase flex justify-center items-center gap-2"><CheckCircle2 size={14}/> Live Now</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* SUBMISSIONS & ROSTER */}
        <div className="xl:col-span-12 mt-8 space-y-8">
          <div className="flex justify-between items-center bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
            <h2 className="font-black text-[10px] uppercase tracking-widest text-slate-400">Class: {selectedClassName}</h2>
            <select value={selectedClassName} onChange={e => setSelectedClassName(e.target.value)} className="p-2 bg-slate-50 rounded-lg text-xs font-bold border-none">
              {classes.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* SUBMISSIONS */}
            <div className="space-y-4">
              {submissions.filter(sub => sub.students?.class_name === selectedClassName).map(sub => (
                <div key={sub.id} className="bg-white p-6 rounded-[32px] shadow-md border border-slate-100">
                  <div className="flex justify-between mb-4">
                    <span className="font-black uppercase text-blue-600 text-xs">{sub.students?.full_name}</span>
                    <span className="text-[10px] font-black text-slate-300">AI Score: {sub.ai_score || '?'}/5</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-4 italic">"{sub.transcript || 'Waiting for AI transcript...'}"</p>
                  <audio controls src={sub.audio_url} className="w-full h-8 mb-4" />
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2">AI Comment</p>
                    <p className="text-xs font-bold text-slate-700">"{sub.teacher_score || 'AI is thinking...'}"</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ROSTER */}
            <div className="bg-white p-8 rounded-[40px] shadow-xl border border-slate-100 h-fit">
              <h2 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2"><Users size={14}/> Add to {selectedClassName}</h2>
              <div className="space-y-3">
                <input value={newStudent.full_name} onChange={e => setNewStudent({...newStudent, full_name: e.target.value})} placeholder="Full Name" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-xs border-none" />
                <input value={newStudent.student_code} onChange={e => setNewStudent({...newStudent, student_code: e.target.value})} placeholder="Student ID/Code" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-xs border-none" />
                <button onClick={async () => {
                   await supabase.from('students').insert([{ ...newStudent, class_name: selectedClassName }])
                   setNewStudent({ full_name: '', student_code: '' }); loadData()
                }} className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black text-[10px] uppercase">Add Student</button>
              </div>
              <div className="mt-8 space-y-2">
                {roster.filter(s => s.class_name === selectedClassName).map(s => (
                  <div key={s.id} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center text-[10px] font-black uppercase">
                    {s.full_name} <span className="text-blue-400">{s.student_code}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
