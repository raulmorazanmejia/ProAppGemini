'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Users, Trash2, RefreshCw, Mic, Square, Target, MessageSquare, School, Plus, CheckCircle2, Award } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function TeacherDashboard() {
  const [prompts, setPrompts] = useState([]); const [submissions, setSubmissions] = useState([]);
  const [classes, setClasses] = useState([]); const [roster, setRoster] = useState([]);
  const [selectedClass, setSelectedClass] = useState(''); const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const channel = supabase.channel('auto-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, () => loadData()).subscribe();
    return () => supabase.removeChannel(channel);
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

  const deleteSubmission = async (id) => {
    if (confirm("Delete this submission permanently?")) {
      await supabase.from('submissions').delete().eq('id', id); loadData();
    }
  }

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center font-black text-blue-600 italic">Syncing Flair Pro...</div>

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-4 font-sans text-[#0F172A]">
      <div className="flex justify-between items-center mb-6 px-4">
        <h1 className="text-3xl font-black italic tracking-tighter text-blue-600">Flair Pro.</h1>
        <div className="flex gap-2">
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="bg-white border-none rounded-xl px-4 py-2 shadow-sm font-bold text-[11px] outline-none">
            {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <button onClick={loadData} className="p-2 bg-white text-blue-600 rounded-xl shadow-sm"><RefreshCw size={16}/></button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-100px)]">
        {/* ROSTER (2/12) */}
        <div className="col-span-2 bg-white p-5 rounded-[24px] shadow-sm border border-slate-200 flex flex-col">
          <h2 className="text-[10px] font-black uppercase text-slate-400 mb-4 flex items-center gap-2"><Users size={12}/> Roster</h2>
          <div className="flex-grow overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
            {roster.filter(s => s.class_name === selectedClass).map(s => (
              <div key={s.id} className="p-2.5 bg-slate-50 rounded-lg flex justify-between items-center border border-slate-100">
                <span className="text-[10px] font-bold">{s.full_name}</span>
                <span className="text-[9px] font-black text-blue-500 uppercase">{s.student_code}</span>
              </div>
            ))}
          </div>
        </div>

        {/* TASKS (3/12) */}
        <div className="col-span-3 bg-white p-5 rounded-[24px] shadow-sm border border-slate-200 flex flex-col">
          <h2 className="text-[10px] font-black uppercase text-blue-600 mb-4 flex items-center gap-2"><Target size={12}/> Tasks</h2>
          <div className="flex-grow overflow-y-auto space-y-2 custom-scrollbar pr-1">
            {prompts.map(p => (
              <div key={p.id} className={`p-4 rounded-2xl border transition ${p.is_active ? 'bg-blue-600 text-white border-blue-700 shadow-md' : 'bg-slate-50 border-slate-100'}`}>
                <p className="text-[10px] font-bold italic line-clamp-2 leading-relaxed">"{p.prompt_text}"</p>
                {!p.is_active && (
                   <button onClick={() => {supabase.from('assignments').update({is_active:false}).neq('id', p.id).then(() => supabase.from('assignments').update({is_active:true}).eq('id', p.id)).then(loadData)}} className="mt-2 w-full py-1.5 bg-white text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm">Deploy</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* FEED (7/12) */}
        <div className="col-span-7 overflow-y-auto space-y-3 custom-scrollbar pr-2">
          {submissions.filter(sub => sub.students?.class_name === selectedClass).map(sub => (
            <div key={sub.id} className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-200 flex gap-4 items-center relative group">
              <button onClick={() => deleteSubmission(sub.id)} className="absolute top-4 right-4 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
              
              <div className="flex-grow max-w-[55%]">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-2 h-2 rounded-full ${sub.status === 'graded' ? 'bg-green-500' : 'bg-amber-400 animate-pulse'}`} />
                  <span className="font-black text-[11px] uppercase tracking-tighter text-slate-800">{sub.students?.full_name}</span>
                </div>
                <audio controls src={sub.audio_url} className="w-full h-8 mb-2 brightness-[0.98]" />
                <p className="text-[10px] text-slate-400 italic font-medium leading-relaxed">"{sub.transcript || 'Transcribing...'}"</p>
              </div>

              <div className="flex-grow bg-slate-50 p-4 rounded-2xl space-y-3 border border-slate-100">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-blue-600 uppercase">Score: {sub.final_score || sub.ai_score || '?'}/5</span>
                  <input type="range" min="1" max="5" defaultValue={sub.final_score || sub.ai_score} onBlur={(e) => supabase.from('submissions').update({ final_score: e.target.value }).eq('id', sub.id)} className="w-20 accent-blue-600" />
                </div>
                <textarea 
                  defaultValue={sub.feedback || sub.teacher_score} 
                  onBlur={(e) => supabase.from('submissions').update({ feedback: e.target.value }).eq('id', sub.id)}
                  className="w-full bg-transparent border-none text-[11px] font-bold text-slate-600 h-12 p-0 focus:ring-0 leading-snug" 
                  placeholder="Drafting feedback..."
                />
                <div className={`py-1 rounded-lg text-center text-[8px] font-black uppercase tracking-[0.2em] ${sub.status === 'graded' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
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