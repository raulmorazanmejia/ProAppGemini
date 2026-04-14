'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Users, LayoutGrid, Trash2, RefreshCw, Mic, Square, Play, Edit3, MessageSquare, Target, Send, School, PlusCircle, CheckCircle2 } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function TeacherDashboard() {
  const [prompts, setPrompts] = useState([]); const [submissions, setSubmissions] = useState([]);
  const [classes, setClasses] = useState([]); const [newTask, setNewTask] = useState('');
  const [selectedClassName, setSelectedClassName] = useState(''); const [newClassName, setNewClassName] = useState('');
  const [isRecordingFeedback, setIsRecordingFeedback] = useState(null); 
  const [feedbackBlobs, setFeedbackBlobs] = useState({});
  const mediaRecorderRef = useRef(null); const chunksRef = useRef([]);

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: c } = await supabase.from('classes').select('*').order('name')
    const { data: p } = await supabase.from('assignments').select('*').order('created_at', { ascending: false })
    const { data: s } = await supabase.from('submissions').select('*, students(full_name, class_name), assignments(prompt_text, rubric_focus)').order('created_at', { ascending: false })
    setClasses(c || []); setPrompts(p || []); setSubmissions(s || [])
    if (c?.length > 0 && !selectedClassName) setSelectedClassName(c[0].name)
  }

  const startFeedbackRec = async (id) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorderRef.current = new MediaRecorder(stream)
    chunksRef.current = []; mediaRecorderRef.current.ondataavailable = (e) => chunksRef.current.push(e.data)
    mediaRecorderRef.current.onstop = () => {
      setFeedbackBlobs(prev => ({ ...prev, [id]: new Blob(chunksRef.current, { type: 'audio/webm' }) }))
    }
    mediaRecorderRef.current.start(); setIsRecordingFeedback(id)
  }

  const pushFinal = async (subId, score, text) => {
    let audioUrl = null
    const blob = feedbackBlobs[subId]
    if (blob) {
      const name = `fb-${subId}-${Date.now()}.webm`
      await supabase.storage.from('audio-feedback').upload(name, blob)
      audioUrl = supabase.storage.from('audio-feedback').getPublicUrl(name).data.publicUrl
    }
    await supabase.from('submissions').update({ 
      final_score: score, feedback: text, feedback_audio_url: audioUrl, status: 'graded' 
    }).eq('id', subId)
    loadData()
  }

  const deleteClass = async (id) => {
    if (confirm("Delete this class? It won't delete students, but will remove the group.")) {
      await supabase.from('classes').delete().eq('id', id); loadData()
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900 font-sans">
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-12">
        <h1 className="text-3xl font-black text-blue-600 italic">Flair Pro.</h1>
        <div className="flex gap-4">
           <input value={newClassName} onChange={e => setNewClassName(e.target.value)} placeholder="New Class..." className="p-3 rounded-xl border-none shadow-sm text-xs" />
           <button onClick={async () => { await supabase.from('classes').insert([{name:newClassName}]); setNewClassName(''); loadData() }} className="bg-slate-900 text-white px-6 rounded-xl text-[10px] font-black uppercase">Add</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* CLASS MANAGER */}
        <div className="xl:col-span-3 space-y-4">
          <h2 className="text-[10px] font-black uppercase text-slate-400">Class List</h2>
          {classes.map(c => (
            <div key={c.id} className={`p-4 rounded-2xl flex justify-between items-center transition ${selectedClassName === c.name ? 'bg-blue-600 text-white shadow-lg' : 'bg-white border'}`}>
              <button onClick={() => setSelectedClassName(c.name)} className="text-xs font-black uppercase text-left truncate w-4/5">{c.name}</button>
              <button onClick={() => deleteClass(c.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
            </div>
          ))}
        </div>

        {/* SUBMISSIONS */}
        <div className="xl:col-span-9 space-y-6">
          <div className="bg-white p-6 rounded-[32px] shadow-sm border mb-8 flex justify-between items-center">
            <h2 className="text-[10px] font-black uppercase text-slate-400">Activity: {selectedClassName}</h2>
            <button onClick={loadData} className="p-2 bg-slate-50 rounded-full"><RefreshCw size={16}/></button>
          </div>

          {submissions.filter(sub => sub.students?.class_name === selectedClassName).map(sub => (
            <div key={sub.id} className="bg-white p-8 rounded-[40px] shadow-lg border relative">
               <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="font-black uppercase text-blue-600 text-sm mb-1">{sub.students?.full_name}</p>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{sub.assignments?.prompt_text}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-blue-600 mb-1">FINAL SCORE: {sub.final_score || sub.ai_score}/5</p>
                    <input type="range" min="1" max="5" defaultValue={sub.final_score || sub.ai_score} onBlur={(e) => supabase.from('submissions').update({ final_score: e.target.value }).eq('id', sub.id)} className="w-24 accent-blue-600" />
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div className="bg-slate-50 p-6 rounded-[32px]">
                    <p className="text-[10px] font-black uppercase text-slate-300 mb-2 italic">Student Audio</p>
                    <audio controls src={sub.audio_url} className="w-full mb-4 h-8" />
                    <p className="text-[10px] text-slate-400 italic">"{sub.transcript || 'Wait for AI...'}"</p>
                  </div>
                  
                  <div className="bg-blue-50 p-6 rounded-[32px] border border-blue-100">
                    <p className="text-[10px] font-black uppercase text-blue-400 mb-2 italic">Teacher Feedback</p>
                    <textarea defaultValue={sub.feedback || sub.teacher_score} onBlur={(e) => supabase.from('submissions').update({ feedback: e.target.value }).eq('id', sub.id)} className="w-full bg-transparent border-none text-xs font-bold text-blue-900 focus:ring-0 p-0 h-12 leading-relaxed" />
                    <div className="flex items-center gap-3 mt-4 border-t border-blue-100 pt-4">
                      <button onClick={isRecordingFeedback === sub.id ? () => {mediaRecorderRef.current.stop(); setIsRecordingFeedback(null)} : () => startFeedbackRec(sub.id)} className={`p-3 rounded-xl text-white ${isRecordingFeedback === sub.id ? 'bg-black animate-pulse' : 'bg-red-500'}`}>
                        {isRecordingFeedback === sub.id ? <Square size={14}/> : <Mic size={14}/>}
                      </button>
                      <span className="text-[10px] font-black uppercase text-blue-300">{feedbackBlobs[sub.id] ? "Voice Ready" : "Record Voice Feedback"}</span>
                    </div>
                  </div>
               </div>

               <button onClick={() => pushFinal(sub.id, sub.final_score || sub.ai_score, sub.feedback || sub.teacher_score)} className={`w-full p-4 rounded-2xl font-black text-[10px] uppercase shadow-lg transition-all ${sub.status === 'graded' ? 'bg-green-500 text-white' : 'bg-slate-900 text-white hover:bg-blue-600'}`}>
                 {sub.status === 'graded' ? 'GRADES PUSHED' : 'PUSH TO STUDENT'}
               </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
