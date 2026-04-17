'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Users, Trash2, RefreshCw, Mic, Square, Play, Send, School, CheckCircle2, Plus, Image as ImageIcon, Trash, Target, MessageSquare } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function TeacherDashboard() {
  const [prompts, setPrompts] = useState([]); const [submissions, setSubmissions] = useState([]);
  const [classes, setClasses] = useState([]); const [roster, setRoster] = useState([]);
  const [selectedClass, setSelectedClass] = useState(''); const [newClass, setNewClass] = useState('');
  const [newTask, setNewTask] = useState(''); const [rubric, setRubric] = useState('general');
  const [taskImage, setTaskImage] = useState(null); const [recId, setRecId] = useState(null);
  const [blobs, setBlobs] = useState({}); const [loading, setLoading] = useState(true);
  const mediaRef = useRef(null); const chunks = useRef([]);

  useEffect(() => {
    loadData();
    const subChannel = supabase.channel('dashboard-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, () => loadData())
      .subscribe();
    return () => supabase.removeChannel(subChannel);
  }, [selectedClass]);

  async function loadData() {
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

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center font-black text-blue-600 italic">Syncing Flair Pro...</div>

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 font-sans text-[#1E293B]">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 px-4">
        <h1 className="text-3xl font-black italic tracking-tighter text-blue-600">Flair Pro.</h1>
        <div className="flex gap-2">
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="bg-white border-none rounded-xl px-4 py-2 shadow-sm font-bold text-xs">
            {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <button onClick={loadData} className="p-2 bg-white text-blue-600 rounded-xl shadow-sm"><RefreshCw size={16}/></button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-100px)]">
        
        {/* COL 1: ROSTER (2/12) */}
        <div className="col-span-2 bg-white p-5 rounded-[30px] shadow-sm border border-slate-100 flex flex-col">
          <h2 className="text-[10px] font-black uppercase text-slate-400 mb-4 flex items-center gap-2"><Users size={12}/> Class Roster</h2>
          <div className="flex-grow overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {roster.filter(s => s.class_name === selectedClass).map(s => (
              <div key={s.id} className="p-2 bg-slate-50 rounded-lg flex justify-between items-center">
                <span className="text-[11px] font-bold truncate">{s.full_name}</span>
                <span className="text-[9px] font-black text-blue-500">{s.student_code}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-50">
             <input value={newClass} onChange={e => setNewClass(e.target.value)} placeholder="New Class..." className="w-full p-2 bg-slate-50 rounded-lg text-[10px] font-bold mb-2 border-none" />
             <button onClick={() => {supabase.from('classes').insert([{name:newClass}]).then(() => {setNewClass(''); loadData()})}} className="w-full bg-slate-900 text-white p-2 rounded-lg text-[10px] font-black uppercase tracking-widest">+ Add</button>
          </div>
        </div>

        {/* COL 2: TASKS (3/12) */}
        <div className="col-span-3 bg-white p-5 rounded-[30px] shadow-sm border border-slate-100 flex flex-col">
          <h2 className="text-[10px] font-black uppercase text-blue-600 mb-4 flex items-center gap-2"><Target size={12}/> Tasks</h2>
          <textarea value={newTask} onChange={e => setNewTask(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl text-[11px] font-bold border-none h-20 mb-3" placeholder="Describe the scene..." />
          <div className="flex gap-2 mb-4">
            <input type="file" id="t-img" className="hidden" onChange={e => setTaskImage(e.target.files[0])} />
            <label htmlFor="t-img" className={`flex-grow p-2 rounded-lg cursor-pointer text-center text-[10px] font-black uppercase ${taskImage ? 'bg-green-500' : 'bg-slate-100 text-slate-400'}`}>
              {taskImage ? 'Image Ready' : 'Add Image'}
            </label>
            <button onClick={handleCreateTask} className="px-4 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase">Save</button>
          </div>
          <div className="flex-grow overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {prompts.map(p => (
              <div key={p.id} className={`p-4 rounded-2xl border transition ${p.is_active ? 'bg-blue-600 text-white border-blue-700' : 'bg-slate-50 border-slate-100'}`}>
                <p className="text-[10px] font-bold italic line-clamp-2">"{p.prompt_text}"</p>
                {!p.is_active && (
                   <button onClick={() => {supabase.from('assignments').update({is_active:false}).neq('id', p.id).then(() => supabase.from('assignments').update({is_active:true}).eq('id', p.id)).then(loadData)}} className="mt-2 w-full py-1 bg-white text-blue-600 rounded-lg text-[9px] font-black uppercase">Deploy</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* COL 3: SUBMISSIONS (7/12) - THE CORE FEED */}
        <div className="col-span-7 overflow-y-auto pr-2 custom-scrollbar space-y-4">
          <h2 className="text-[10px] font-black uppercase text-slate-400 px-2 tracking-widest flex items-center gap-2"><MessageSquare size={12}/> Live Submissions</h2>
          {submissions.filter(sub => sub.students?.class_name === selectedClass).map(sub => (
            <div key={sub.id} className="bg-white p-5 rounded-[30px] shadow-sm border border-slate-50 flex gap-6 items-start relative group">
              <button onClick={() => {if(confirm("Delete?")) supabase.from('submissions').delete().eq('id', sub.id).then(loadData)}} className="absolute top-4 right-4 text-slate-100 group-hover:text-red-400 transition-colors"><Trash2 size={16}/></button>
              
              <div className="flex-grow max-w-[60%]">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-2 h-2 rounded-full ${sub.status === 'graded' ? 'bg-green-500' : 'bg-yellow-400 animate-pulse'}`} />
                  <span className="font-black text-[11px] uppercase text-blue-600">{sub.students?.full_name}</span>
                </div>
                <audio controls src={sub.audio_url} className="w-full h-8 mb-3" />
                <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-500 leading-relaxed italic">"{sub.transcript || 'Transcribing with AI...'}"</p>
                </div>
              </div>

              <div className="flex-grow space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Grade: {sub.final_score || sub.ai_score}/5</span>
                  <input type="range" min="1" max="5" defaultValue={sub.final_score || sub.ai_score} onBlur={(e) => supabase.from('submissions').update({ final_score: e.target.value }).eq('id', sub.id)} className="w-20 accent-blue-600" />
                </div>
                <textarea 
                  defaultValue={sub.feedback || sub.teacher_score} 
                  onBlur={(e) => supabase.from('submissions').update({ feedback: e.target.value, status: 'graded' }).eq('id', sub.id)}
                  className="w-full bg-slate-50 p-3 rounded-xl border-none text-[11px] font-bold text-slate-700 h-16 focus:ring-1 focus:ring-blue-100" 
                  placeholder="AI Feedback appears here..."
                />
                <div className={`py-1.5 rounded-lg text-center text-[9px] font-black uppercase tracking-widest ${sub.status === 'graded' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                  {sub.status === 'graded' ? 'Live for Student' : 'Analyzing...'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}