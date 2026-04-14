'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Users, Trash2, RefreshCw, Mic, Square, Play, Send, School, CheckCircle2, Plus, Image as ImageIcon, X, Trash } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function TeacherDashboard() {
  const [prompts, setPrompts] = useState([]); const [submissions, setSubmissions] = useState([]);
  const [classes, setClasses] = useState([]); const [roster, setRoster] = useState([]);
  const [selectedClass, setSelectedClass] = useState(''); const [newClass, setNewClass] = useState('');
  const [newTask, setNewTask] = useState(''); const [rubric, setRubric] = useState('general');
  const [taskImage, setTaskImage] = useState(null); const [recId, setRecId] = useState(null);
  const [blobs, setBlobs] = useState({}); const [loading, setLoading] = useState(true);
  const mediaRef = useRef(null); const chunks = useRef([]);

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: c } = await supabase.from('classes').select('*').order('name')
    const { data: p } = await supabase.from('assignments').select('*').order('created_at', { ascending: false })
    const { data: s } = await supabase.from('submissions').select('*, students(full_name, class_name), assignments(prompt_text)').order('created_at', { ascending: false })
    const { data: r } = await supabase.from('students').select('*').order('full_name')
    setClasses(c || []); setPrompts(p || []); setSubmissions(s || []); setRoster(r || [])
    if (c?.length > 0 && !selectedClass) setSelectedClass(c[0].name)
    setLoading(false)
  }

  const handleCreateTask = async () => {
    let url = null
    if (taskImage) {
      const name = `img-${Date.now()}`
      await supabase.storage.from('assignment-images').upload(name, taskImage)
      url = supabase.storage.from('assignment-images').getPublicUrl(name).data.publicUrl
    }
    await supabase.from('assignments').insert([{ prompt_text: newTask, image_prompt_url: url, rubric_focus: rubric, is_active: false }])
    setNewTask(''); setTaskImage(null); loadData()
  }

  const deleteSubmission = async (id) => {
    if (confirm("Delete this submission?")) {
      await supabase.from('submissions').delete().eq('id', id); loadData()
    }
  }

  const pushFinal = async (subId, score, text) => {
    let url = null
    if (blobs[subId]) {
      const name = `fb-${subId}.webm`
      await supabase.storage.from('audio-feedback').upload(name, blobs[subId], { upsert: true })
      url = supabase.storage.from('audio-feedback').getPublicUrl(name).data.publicUrl
    }
    await supabase.from('submissions').update({ final_score: score, feedback: text, feedback_audio_url: url, status: 'graded' }).eq('id', subId)
    loadData()
  }

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center font-black text-blue-600 italic">Flair Pro Loading...</div>

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 font-sans text-[#1E293B]">
      {/* HEADER */}
      <div className="max-w-[1600px] mx-auto flex justify-between items-center mb-8 px-4">
        <h1 className="text-4xl font-black italic tracking-tighter text-blue-600">Flair Pro.</h1>
        <div className="flex gap-3">
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="bg-white border-none rounded-2xl px-6 py-3 shadow-sm font-bold text-sm outline-none">
            {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <button onClick={() => {if(confirm(`Delete ${selectedClass}?`)) supabase.from('classes').delete().eq('name', selectedClass).then(loadData)}} className="p-3 bg-white text-red-400 rounded-2xl shadow-sm hover:bg-red-50"><Trash2 size={18}/></button>
          <button onClick={loadData} className="p-3 bg-white text-blue-600 rounded-2xl shadow-sm"><RefreshCw size={18}/></button>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto grid grid-cols-12 gap-8 px-4">
        
        {/* COL 1: ROSTER (3/12) */}
        <div className="col-span-3 space-y-6">
          <div className="bg-white p-6 rounded-[35px] shadow-sm border border-slate-100">
            <h2 className="text-[11px] font-black uppercase text-slate-400 mb-6 flex items-center gap-2"><School size={14}/> {selectedClass || 'Class'} Roster</h2>
            <div className="max-h-[450px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {roster.filter(s => s.class_name === selectedClass).map(s => (
                <div key={s.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <span className="text-xs font-bold">{s.full_name}</span>
                  <span className="text-[10px] font-black text-blue-500 bg-white px-2 py-1 rounded-lg">{s.student_code}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white p-6 rounded-[35px] shadow-sm border border-slate-100">
            <h2 className="text-[11px] font-black uppercase text-slate-400 mb-4">Add Class</h2>
            <div className="flex gap-2">
              <input value={newClass} onChange={e => setNewClass(e.target.value)} placeholder="Name..." className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold border-none" />
              <button onClick={() => {supabase.from('classes').insert([{name:newClass}]).then(() => {setNewClass(''); loadData()})}} className="p-3 bg-blue-600 text-white rounded-xl"><Plus size={18}/></button>
            </div>
          </div>
        </div>

        {/* COL 2: ASSIGNMENTS (3/12) */}
        <div className="col-span-3 space-y-6">
          <div className="bg-white p-6 rounded-[35px] shadow-sm border border-slate-100">
            <h2 className="text-[11px] font-black uppercase text-blue-600 mb-6 flex items-center gap-2"><ImageIcon size={14}/> Create Task</h2>
            <textarea value={newTask} onChange={e => setNewTask(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold border-none h-24 mb-4" placeholder="Describe the scene..." />
            <div className="flex gap-2 mb-4">
              <select value={rubric} onChange={e => setRubric(e.target.value)} className="flex-grow p-3 bg-slate-100 rounded-xl text-[10px] font-black border-none">
                <option value="general">Focus: General</option>
                <option value="pronunciation">Focus: Pronunciation</option>
              </select>
              <input type="file" id="t-img" className="hidden" onChange={e => setTaskImage(e.target.files[0])} />
              <label htmlFor="t-img" className={`p-3 rounded-xl cursor-pointer ${taskImage ? 'bg-green-500' : 'bg-slate-900'} text-white`}><Plus size={18}/></label>
            </div>
            <button onClick={handleCreateTask} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest">Save</button>
          </div>

          <div className="space-y-3">
            {prompts.map(p => (
              <div key={p.id} className={`p-5 rounded-[30px] border transition ${p.is_active ? 'bg-blue-600 text-white shadow-xl' : 'bg-white'}`}>
                <p className="text-xs font-bold mb-3 line-clamp-2 italic">"{p.prompt_text}"</p>
                {!p.is_active ? (
                  <button onClick={() => {supabase.from('assignments').update({is_active:false}).neq('id', p.id).then(() => supabase.from('assignments').update({is_active:true}).eq('id', p.id)).then(loadData)}} className="text-[9px] font-black uppercase tracking-widest bg-slate-50 text-slate-400 w-full py-2 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition">Deploy</button>
                ) : (
                  <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest opacity-80"><CheckCircle2 size={12}/> Live Now</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* COL 3: SUBMISSIONS (6/12) */}
        <div className="col-span-6 space-y-4">
          <h2 className="text-[11px] font-black uppercase text-slate-400 px-2 mb-2">Recent Submissions</h2>
          {submissions.filter(sub => sub.students?.class_name === selectedClass).map(sub => (
            <div key={sub.id} className="bg-white p-6 rounded-[35px] shadow-sm border border-slate-50 relative group">
              <button onClick={() => deleteSubmission(sub.id)} className="absolute top-6 right-6 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash size={16}/></button>
              
              <div className="flex gap-6 items-start">
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest">{sub.students?.full_name}</span>
                  </div>
                  <audio controls src={sub.audio_url} className="w-full h-8 mb-4 brightness-[0.98]" />
                  <p className="text-[10px] text-slate-400 italic mb-6">"{sub.transcript || 'AI is transcribing...'}"</p>
                </div>

                <div className="w-44 text-right space-y-3">
                  <div className="bg-slate-50 p-3 rounded-2xl">
                    <span className="text-[10px] font-black text-blue-600 uppercase">Grade: {sub.final_score || sub.ai_score}/5</span>
                    <input type="range" min="1" max="5" defaultValue={sub.final_score || sub.ai_score} onBlur={(e) => supabase.from('submissions').update({ final_score: e.target.value }).eq('id', sub.id)} className="w-full accent-blue-600 mt-2" />
                  </div>
                  <button onClick={() => pushFinal(sub.id, sub.final_score || sub.ai_score, sub.feedback || sub.teacher_score)} className={`w-full py-3 rounded-2xl text-[9px] font-black uppercase ${sub.status === 'graded' ? 'bg-green-500 text-white' : 'bg-slate-900 text-white'}`}>
                    {sub.status === 'graded' ? 'Pushed ✅' : 'Push to Student'}
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl mt-4 border border-slate-100">
                <p className="text-[9px] font-black text-slate-300 uppercase mb-2 italic">Teacher Feedback</p>
                <textarea defaultValue={sub.feedback || sub.teacher_score} onBlur={(e) => supabase.from('submissions').update({ feedback: e.target.value }).eq('id', sub.id)} className="w-full bg-transparent border-none text-xs font-bold text-slate-600 p-0 focus:ring-0 leading-relaxed" placeholder="Type feedback..." />
              </div>
            </div>
          ))}
          {submissions.filter(sub => sub.students?.class_name === selectedClass).length === 0 && (
            <div className="py-20 text-center text-slate-300 italic font-black">No submissions yet for this class.</div>
          )}
        </div>
      </div>
    </div>
  )
}