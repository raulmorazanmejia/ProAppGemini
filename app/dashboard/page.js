'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Users, Trash2, RefreshCw, Mic, Square, Play, Send, School, CheckCircle2, Plus, Image as ImageIcon, X } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function TeacherDashboard() {
  const [submissions, setSubmissions] = useState([]); const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(''); const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    // Dashboard Sync: Auto-refresh when AI finishes its work
    const channel = supabase.channel('auto-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, () => loadData()).subscribe();
    return () => supabase.removeChannel(channel);
  }, [selectedClass]);

  async function loadData() {
    const { data: c } = await supabase.from('classes').select('*').order('name')
    const { data: s } = await supabase.from('submissions').select('*, students(full_name, class_name), assignments(prompt_text)').order('created_at', { ascending: false })
    setClasses(c || []); setSubmissions(s || [])
    if (c?.length > 0 && !selectedClass) setSelectedClass(c[0].name)
    setLoading(false)
  }

  const updateGrade = async (subId, score, text) => {
    // If you manually override the AI, this sends the new data to the student
    await supabase.from('submissions').update({ final_score: score, feedback: text }).eq('id', subId)
    alert("Grade Updated")
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 font-sans">
      <div className="max-w-[1600px] mx-auto flex justify-between items-center mb-8">
        <h1 className="text-4xl font-black italic tracking-tighter text-blue-600">Flair Pro.</h1>
        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="bg-white border-none rounded-2xl px-6 py-3 shadow-sm font-bold text-sm">
          {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 space-y-4">
          <h2 className="text-[11px] font-black uppercase text-slate-400 px-2 tracking-widest">Live Lab Activity</h2>
          {submissions.filter(sub => sub.students?.class_name === selectedClass).map(sub => (
            <div key={sub.id} className="bg-white p-6 rounded-[35px] shadow-sm border border-slate-50 flex gap-6 items-center">
              <div className="flex-grow">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${sub.status === 'graded' ? 'bg-green-500' : 'bg-yellow-400 animate-pulse'}`} />
                  <span className="font-black text-xs uppercase">{sub.students?.full_name}</span>
                </div>
                <audio controls src={sub.audio_url} className="w-full h-8 mb-2" />
                <p className="text-[10px] text-slate-400 italic">"{sub.transcript || 'AI Analyzing...'}"</p>
              </div>

              <div className="w-64 bg-slate-50 p-4 rounded-3xl space-y-3">
                 <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-blue-600 uppercase">Score: {sub.final_score || sub.ai_score}/5</span>
                    <button onClick={() => updateGrade(sub.id, sub.final_score || sub.ai_score, sub.feedback)} className="text-[9px] font-black uppercase text-blue-400 hover:underline">Override</button>
                 </div>
                 <textarea 
                    defaultValue={sub.feedback} 
                    onBlur={(e) => supabase.from('submissions').update({ feedback: e.target.value }).eq('id', sub.id)}
                    className="w-full bg-transparent border-none text-[11px] font-bold text-slate-600 h-12 p-0 focus:ring-0 leading-tight" 
                 />
                 <div className="text-[9px] font-black uppercase text-center py-1 rounded-lg bg-green-100 text-green-600 tracking-widest">
                    {sub.status === 'graded' ? 'Sent to Student' : 'Analyzing...'}
                 </div>
              </div>
              <button onClick={() => supabase.from('submissions').delete().eq('id', sub.id).then(loadData)} className="text-slate-200 hover:text-red-500"><Trash2 size={18}/></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}