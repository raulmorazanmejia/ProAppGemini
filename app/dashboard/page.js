'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Users, LayoutGrid, Trash2, RefreshCw, Play, Edit3, Save, MessageSquare, Target, Send, Image as ImageIcon, School, PlusCircle } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function TeacherDashboard() {
  const [prompts, setPrompts] = useState([]); const [submissions, setSubmissions] = useState([]);
  const [roster, setRoster] = useState([]); const [newTask, setNewTask] = useState('');
  const [rubric, setRubric] = useState('general'); const [taskImage, setTaskImage] = useState(null);
  const [taskImagePreview, setTaskImagePreview] = useState(null);
  const [newStudent, setNewStudent] = useState({ full_name: '', student_code: '', class_name: '' });
  const [selectedClass, setSelectedClass] = useState('All Classes');
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: p } = await supabase.from('assignments').select('*').order('created_at', { ascending: false })
    const { data: s } = await supabase.from('submissions').select('*, students(full_name, class_name), assignments(prompt_text, image_prompt_url, rubric_focus)').order('created_at', { ascending: false })
    const { data: r } = await supabase.from('students').select('*').order('class_name', { ascending: true })
    setPrompts(p || []); setSubmissions(s || []); setRoster(r || []); setLoading(false)
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) { setTaskImage(file); setTaskImagePreview(URL.createObjectURL(file)) }
  }

  const saveTask = async () => {
    let imageUrl = null
    if (taskImage) {
      const name = `prompt-${Date.now()}.png`
      await supabase.storage.from('assignment-images').upload(name, taskImage)
      imageUrl = supabase.storage.from('assignment-images').getPublicUrl(name).data.publicUrl
    }
    await supabase.from('assignments').insert([{ prompt_text: newTask, image_prompt_url: imageUrl, rubric_focus: rubric }])
    setNewTask(''); setTaskImage(null); setTaskImagePreview(null); loadData()
  }

  const pushToStudent = async (subId, score, comment) => {
    await supabase.from('submissions').update({ final_score: score, feedback: comment, status: 'graded' }).eq('id', subId)
    loadData()
  }

  const getClasses = () => ['All Classes', ...new Set(roster.map(s => s.class_name))];

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-black tracking-widest uppercase">Syncing Pro Roster...</div>

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-12">
        <h1 className="text-3xl font-black tracking-tighter text-blue-600 italic">Flair Pro Dashboard.</h1>
        <button onClick={loadData} className="p-3 bg-white shadow-sm hover:bg-slate-100 rounded-full transition"><RefreshCw size={20} className="text-blue-600" /></button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* TASK CREATOR */}
        <div className="xl:col-span-4 bg-white p-8 rounded-[40px] shadow-xl border border-slate-100 h-fit space-y-4">
          <h2 className="font-black text-[10px] uppercase tracking-widest text-blue-600 mb-2 flex items-center gap-2"><Target size={14}/> Create Visual Task</h2>
          <textarea value={newTask} onChange={e => setNewTask(e.target.value)} className="w-full p-4 border rounded-2xl h-24 text-sm font-bold bg-slate-50 border-slate-100" placeholder="Describe this image in one minute..." />
          <div className="flex gap-4 items-center">
            <select value={rubric} onChange={(e) => setRubric(e.target.value)} className="flex-grow p-3 bg-slate-100 rounded-xl text-xs font-bold border-none">
              <option value="general">Focus: General ESL</option>
              <option value="pronunciation">Focus: Pronunciation</option>
              <option value="grammar">Focus: Grammar</option>
            </select>
            <button onClick={() => fileInputRef.current.click()} className="p-3 bg-slate-900 text-white rounded-xl flex items-center gap-2 text-xs font-black uppercase"><ImageIcon size={14}/> Image</button>
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
          </div>
          {taskImagePreview && <img src={taskImagePreview} className="w-full h-32 object-cover rounded-2xl border-4 border-slate-100 shadow-sm" />}
          <button onClick={saveTask} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:shadow-lg transition">Deploy to Students</button>
        </div>

        {/* SUBMISSIONS LIST */}
        <div className="xl:col-span-8 space-y-6">
          <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6">
            <h2 className="font-black text-[10px] uppercase tracking-widest text-slate-400 flex items-center gap-2"><MessageSquare size={14}/> Activity Filter</h2>
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="p-2 border-none bg-slate-50 rounded-xl text-xs font-bold">
              {getClasses().map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {submissions.filter(sub => selectedClass === 'All Classes' || sub.students?.class_name === selectedClass).map(sub => (
            <div key={sub.id} className="bg-white p-8 rounded-[40px] shadow-lg border border-slate-50 relative group">
              <button onClick={async () => { if(confirm("Delete?")) {await supabase.from('submissions').delete().eq('id', sub.id); loadData()} }} className="absolute top-6 right-6 text-slate-200 group-hover:text-red-500 transition"><Trash2 size={16}/></button>
              <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-6">
                <div>
                  <p className="font-black uppercase text-blue-600 text-sm">{sub.students?.full_name}</p>
                  <p className="text-[10px] text-slate-300 font-black uppercase flex items-center gap-1 mt-1"><School size={10}/> {sub.students?.class_name} • {sub.assignments?.rubric_focus}</p>
                </div>
                <div className="flex flex-col items-end gap-2 bg-slate-50 p-3 rounded-xl">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">Override: {sub.final_score || sub.ai_score}/5</span>
                  <input type="range" min="1" max="5" value={sub.final_score || sub.ai_score} onChange={(e) => supabase.from('submissions').update({ final_score: e.target.value }).eq('id', sub.id).then(loadData)} className="w-32 accent-blue-600" />
                </div>
              </div>
              
              <div className="flex gap-6 mb-6">
                {sub.assignments?.image_prompt_url && <img src={sub.assignments?.image_prompt_url} className="w-48 h-32 object-cover rounded-2xl border border-slate-100 shadow-sm" />}
                <div className="flex-grow bg-slate-50 p-6 rounded-[32px]">
                  <p className="text-[10px] font-black uppercase text-slate-300 mb-2 italic">Student Transcript</p>
                  <p className="text-xs text-slate-500 italic mb-4">"{sub.transcript}"</p>
                  <p className="text-[10px] font-black uppercase text-blue-400 mb-2 italic">AI/Teacher Feedback</p>
                  <textarea defaultValue={sub.feedback || sub.teacher_score} onBlur={(e) => supabase.from('submissions').update({ feedback: e.target.value }).eq('id', sub.id)} className="w-full bg-transparent border-none text-xs font-bold text-slate-700 h-12 leading-relaxed focus:ring-0 p-0" />
                </div>
              </div>

              <div className="flex gap-4">
                <audio controls src={sub.audio_url} className="w-full h-8" />
                <button onClick={() => pushToStudent(sub.id, sub.final_score || sub.ai_score, sub.feedback || sub.teacher_score)} className={`px-8 rounded-2xl font-black text-[10px] uppercase shadow-sm transition-all ${sub.status === 'graded' ? 'bg-green-500 text-white' : 'bg-slate-900 text-white hover:bg-blue-600'}`}>
                  {sub.status === 'graded' ? 'Graded' : 'Push'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* MULTI-CLASS ROSTER */}
        <div className="xl:col-span-12 bg-white p-8 rounded-[40px] shadow-xl border border-slate-100">
          <h2 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2"><PlusCircle size={14}/> Roster Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
            <input value={newStudent.full_name} onChange={e => setNewStudent({...newStudent, full_name: e.target.value})} placeholder="Full Name" className="p-3 border rounded-xl text-xs font-bold bg-slate-50" />
            <input value={newStudent.student_code} onChange={e => setNewStudent({...newStudent, student_code: e.target.value})} placeholder="Access Code" className="p-3 border rounded-xl text-xs font-bold bg-slate-50" />
            <input value={newStudent.class_name} onChange={e => setNewStudent({...newStudent, class_name: e.target.value})} placeholder="Class Name" className="p-3 border rounded-xl text-xs font-bold bg-slate-50" />
            <button onClick={async () => { await supabase.from('students').insert([newStudent]); setNewStudent({full_name:'', student_code:'', class_name:''}); loadData() }} className="bg-slate-900 text-white p-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition">Add Student</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {roster.map(s => <div key={s.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group">
              <div>
                <p className="text-xs font-black uppercase text-slate-700">{s.full_name}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{s.class_name}</p>
              </div>
              <span className="text-[10px] font-black text-blue-400 bg-white px-2 py-1 rounded-lg shadow-sm">{s.student_code}</span>
            </div>)}
          </div>
        </div>
      </div>
    </div>
  )
}
