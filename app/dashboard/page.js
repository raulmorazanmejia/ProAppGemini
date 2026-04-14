'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { CheckCircle, Users, LayoutGrid, Trash2, RefreshCw, Play, Edit3, Save, MessageSquare, Target, Send, Image as ImageIcon, School } from 'lucide-react'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
      await supabase.storage.from('student-audio').upload(name, taskImage) // Use existing bucket for simplicity
      imageUrl = supabase.storage.from('student-audio').getPublicUrl(name).data.publicUrl
    }
    await supabase.from('assignments').insert([{ prompt_text: newTask, image_prompt_url: imageUrl, rubric_focus: rubric }])
    setNewTask(''); setTaskImage(null); setTaskImagePreview(null); loadData()
  }

  const pushToStudent = async (subId, score, comment) => {
    await supabase.from('submissions').update({ final_score: score, feedback: comment, status: 'graded' }).eq('id', subId)
    loadData()
  }

  const deleteSubmission = async (id) => {
    if (confirm("Delete this submission?")) {
      await supabase.from('submissions').delete().eq('id', id); loadData()
    }
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
        
        {/* TASK CREATOR (WITH IMAGE) */}
        <div className="xl:col-span-4 bg-white p-8 rounded-[40px] shadow-xl border border-slate-100 h-fit space-y-4">
          <h2 className="font-black text-[10px] uppercase tracking-widest text-blue-600 mb-2 flex items-center gap-2"><Target size={14}/> Create Visual Task</h2>
          <textarea value={newTask} onChange={e => setNewTask(e.target.value)} className="w-full p-4 border rounded-2xl h-24 text-sm font-bold bg-slate-50 border-slate-100" placeholder="e.g., Describe the scenery in this picture..." />
          
          <div className="flex gap-4 items-center">
            <select value={rubric} onChange={(e) => setRubric(e.target.value)} className="flex-grow p-3 bg-slate-100 rounded-xl text-xs font-bold border-none">
              <option value="general">Focus: General ESL</option>
              <option value="pronunciation">Focus: Pronunciation</option>
              <option value="grammar">Focus: Grammar</option>
            </select>
            <button onClick={() => fileInputRef.current.click()} className="p-3 bg-slate-900 text-white rounded-xl flex items-center gap-2 text-xs font-black uppercase"><ImageIcon size={14}/> Add Image</button>
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
          </div>
          {taskImagePreview && <img src={taskImagePreview} className="w-full h-32 object-cover rounded-2xl border-4 border-slate-100" />}
          <button onClick={saveTask} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-widest">Deploy to Students</button>
        </div>

        {/* SUBMISSIONS LIST (CLASS FILTERED) */}
        <div className="xl:col-span-8 space-y-6">
          <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6">
            <h2 className="font-black text-[10px] uppercase tracking-widest text-slate-400 flex items-center gap-2"><MessageSquare size={14}/> Recent Activity</h2>
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="p-2 border-none bg-slate-50 rounded-xl text-xs font-bold">
              {getClasses().map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {submissions.filter(sub => selectedClass === 'All Classes' || sub.students?.class_name === selectedClass).map(sub => (
            <div key={sub.id} className="bg-white p-8 rounded-[40px] shadow-lg border border-slate-50 relative">
              <button onClick={() => deleteSubmission(sub.id)} className="absolute top-6 right-6 text-slate-200 hover:text-red-500 transition"><Trash2 size={16}/></button>
              <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-6">
                <div>
                  <p className="font-black uppercase text-blue-600 text-sm">{sub.students?.full_name}</p>
                  <p className="text-[10px] text-slate-300 font-black uppercase flex items-center gap-1 mt-1"><School size={10}/> {sub.students?.class_name} • {sub.assignments?.rubric_focus}</p>
                </div>
                <div className="flex flex-col items-end gap-2 bg-slate-50 p-3 rounded-xl">
                  <span className="text-[10px] font-black text-blue-600">FINAL SCORE: {sub.final_score || sub.ai_score}/5</span>
                  <input type="range" min="1" max="5" value={sub.final_score || sub.ai_score} 
                    onChange={(e) => supabase.from('submissions').update({ final_score: e.target.value }).eq('id', sub.id).then(loadData)}
                    className="w-32 accent-blue-600" />
                </div>
              </div>
              
              {sub.assignments?.image_prompt_url && <img src={sub.assignments?.image_prompt_url} className="w-32 h-20 object-cover rounded-xl border border-slate-100 mb-4" />}

              <div className="space-y-4 mb-6 bg-slate-50 p-6 rounded-3xl">
                <p className="text-[10px] font-black uppercase text-slate-300 italic">Teacher Feedback</p>
                <textarea defaultValue={sub.feedback || sub.teacher_score} onBlur={(e) => supabase.from('submissions').update({ feedback: e.target.value }).eq('id', sub.id)} className="w-full bg-transparent border-none text-xs font-bold text-slate-700 h-16 leading-relaxed" />
              </div>

              <div className="flex gap-4">
                <audio controls src={sub.audio_url} className="w-full h-8" />
                <button onClick={() => pushToStudent(sub.id, sub.final_score || sub.ai_score, sub.feedback || sub.teacher_score)} className={`px-6 rounded-2xl font-black text-[10px] uppercase ${sub.status === 'graded' ? 'bg-green-500 text-white' : 'bg-slate-900 text-white'}`}>
                  {sub.status === 'graded' ? 'Grade Pushed' : 'Push to Student'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* MULTI-CLASS ROSTER */}
        <div className="xl:col-span-12 bg-white p-8 rounded-[40px] shadow-xl border border-slate-100">
          <h2 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2"><Users size={14}/> Class Roster</h2>
          <div className="grid grid-cols-4 gap-3 mb-6">
            <input value={newStudent.full_name} onChange={e => setNewStudent({...newStudent, full_name: e.target.value})} placeholder="Full Name" className="w-full p-3 border rounded-xl text-xs font-bold bg-slate-50" />
            <input value={newStudent.student_code} onChange={e => setNewStudent({...newStudent, student_code: e.target.value})} placeholder="Access Code" className="w-full p-3 border rounded-xl text-xs font-bold bg-slate-50" />
            <input value={newStudent.class_name} onChange={e => setNewStudent({...newStudent, class_name: e.target.value})} placeholder="Class Name (e.g., Alar A)" className="w-full p-3 border rounded-xl text-xs font-bold bg-slate-50" />
            <button onClick={async () => { await supabase.from('students').insert([newStudent]); setNewStudent({full_name:'', student_code:'', class_name:''}); loadData() }} className="w-full bg-slate-900 text-white p-3 rounded-xl font-black text-[10px] uppercase tracking-widest">Add to Roster</button>
          </div>
          <div className="space-y-2">{roster.map(s => <div key={s.id} className="p-3 bg-slate-50 rounded-xl text-[10px] font-black flex justify-between">{s.full_name} <span className="text-slate-400">{s.class_name} • {s.student_code}</span></div>)}</div>
        </div>
      </div>
    </div>
  )
}
