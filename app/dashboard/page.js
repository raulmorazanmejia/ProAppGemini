'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Users, Trash2, RefreshCw, Mic, Square, Target, MessageSquare, School, Plus, CheckCircle2 } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function TeacherDashboard() {
  const [submissions, setSubmissions] = useState([]); const [classes, setClasses] = useState([]);
  const [roster, setRoster] = useState([]); const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const channel = supabase.channel('auto-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, () => loadData()).subscribe();
    return () => supabase.removeChannel(channel);
  }, [selectedClass]);

  async function loadData() {
    const { data: c } = await supabase.from('classes').select('*').order('name')
    const { data: s } = await supabase.from('submissions').select('*, students(full_name, class_name), assignments(prompt_text)').order('created_at', { ascending: false })
    const { data: r } = await supabase.from('students').select('*').order('full_name')
    setClasses(c || []); setSubmissions(s || []); setRoster(r || [])
    if (c?.length > 0 && !selectedClass) setSelectedClass(c[0].name)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-6 font-sans text-[#0F172A]">
      <div className="flex justify-between items-center mb-8 px-4">
        <h1 className="text-4xl font-black italic tracking-tighter text-blue-600">Flair Pro.</h1>
        <div className="flex gap-2">
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="bg-white border-none rounded-xl px-6 py-3 shadow-sm font-bold text-xs outline-none">
            {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <button onClick={loadData} className="p-3 bg-white text-blue-600 rounded-xl shadow-sm"><RefreshCw size={18}/></button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* COL 1: ROSTER (3/12) */}
        <div className="col-span-3 bg-white p-6 rounded-[32px] shadow-sm border border-slate-200">
          <h2 className="text-[10px] font-black uppercase text-slate-400 mb-6 flex items-center gap-2"><Users size={12}/> {selectedClass} Roster</h2>
          <div className="space-y-2">
            {roster.filter(s => s.class_name === selectedClass).map(s => (
              <div key={s.id} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center border border-slate-100">
                <span className="text-[11px] font-bold">{s.full_name}</span>
                <span className="text-[9px] font-black text-blue-500 uppercase">{s.student_code}</span>
              </div>
            ))}
          </div>
        </div>

        {/* COL 2 & 3: SUBMISSIONS FEED (9/12) */}
        <div className="col-span-9 space-y-4">
          <h2 className="text-[10px] font-black uppercase text-slate-400 px-2 tracking-widest flex items-center gap-2"><MessageSquare size={12}/> Live Lab Activity</h2>
          {submissions.filter(sub => sub.students?.class_name === selectedClass).map(sub => (
            <div key={sub.id} className="bg-white p-6 rounded-[40px] shadow-sm border border-slate-200 flex gap-8 items-center relative group">
              <button onClick={() => supabase.from('submissions').delete().eq('id', sub.id).then(loadData)} className="absolute top-6 right-6 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={20}/></button>
              
              <div className="flex-grow max-w-[60%]">
                <div className="flex items-center gap-2 mb-4">
                  <span className={`w-2.5 h-2.5 rounded-full ${sub.status === 'graded' ? 'bg-green-500' : 'bg-amber-400 animate-pulse'}`} />
                  <span className="font-black text-sm uppercase tracking-tighter text-slate-800">{sub.students?.full_name}</span>
                </div>
                <audio controls src={sub.audio_url} className="w-full h-8 mb-4 brightness-[0.98]" />
                <p className="text-[11px] text-slate-400 italic leading-relaxed">"{sub.transcript || 'AI analysis in progress...'}"</p>
              </div>

              <div className="w-72 bg-slate-50 p-6 rounded-[32px] space-y-4 border border-slate-100">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-blue-600 uppercase">Score: {sub.final_score || sub.ai_score || '?'}/5</span>
                  <input type="range" min="1" max="5" defaultValue={sub.final_score || sub.ai_score} onBlur={(e) => supabase.from('submissions').update({ final_score: e.target.value }).eq('id', sub.id)} className="w-24 accent-blue-600" />
                </div>
                <textarea 
                  defaultValue={sub.feedback || sub.teacher_score} 
                  onBlur={(e) => supabase.from('submissions').update({ feedback: e.target.value }).eq('id', sub.id)}
                  className="w-full bg-transparent border-none text-[11px] font-bold text-slate-600 h-16 p-0 focus:ring-0 leading-snug" 
                  placeholder="Drafting feedback..."
                />
                <div className={`py-1.5 rounded-xl text-center text-[9px] font-black uppercase tracking-[0.2em] ${sub.status === 'graded' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
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