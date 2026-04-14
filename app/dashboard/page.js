'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Users, LayoutGrid, RefreshCw, Mic, Square, Trash2, Send, School, CheckCircle2, MessageSquare } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function TeacherDashboard() {
  const [prompts, setPrompts] = useState([]); const [submissions, setSubmissions] = useState([]);
  const [classes, setClasses] = useState([]); const [selectedClass, setSelectedClass] = useState('');
  const [recId, setRecId] = useState(null); const [blobs, setBlobs] = useState({});
  const mediaRef = useRef(null); const chunks = useRef([]);

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: c } = await supabase.from('classes').select('*').order('name')
    const { data: s } = await supabase.from('submissions').select('*, students(full_name, class_name), assignments(prompt_text)').order('created_at', { ascending: false })
    setClasses(c || []); setSubmissions(s || [])
    if (c?.length > 0 && !selectedClass) setSelectedClass(c[0].name)
  }

  const startFeedbackRec = async (id) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRef.current = new MediaRecorder(stream)
    chunks.current = []; mediaRef.current.ondataavailable = (e) => chunks.current.push(e.data)
    mediaRef.current.onstop = () => setBlobs(p => ({ ...p, [id]: new Blob(chunks.current, { type: 'audio/webm' }) }))
    mediaRef.current.start(); setRecId(id)
  }

  const pushFinal = async (subId, score, feedbackText) => {
    let audioUrl = null
    if (blobs[subId]) {
      const name = `fb-${subId}-${Date.now()}.webm`
      await supabase.storage.from('audio-feedback').upload(name, blobs[subId], { upsert: true })
      audioUrl = supabase.storage.from('audio-feedback').getPublicUrl(name).data.publicUrl
    }
    await supabase.from('submissions').update({ 
      final_score: score, feedback: feedbackText, feedback_audio_url: audioUrl, status: 'graded' 
    }).eq('id', subId)
    loadData()
  }

  const handleDeleteClass = async () => {
    if (confirm(`Delete ${selectedClass}?`)) {
      await supabase.from('classes').delete().eq('name', selectedClass)
      setSelectedClass(''); loadData()
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-12">
        <h1 className="text-3xl font-black text-blue-600 italic">Flair Pro.</h1>
        <div className="flex gap-4">
           <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="p-3 bg-white rounded-xl text-xs font-bold border-none shadow-sm">
             {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
           </select>
           <button onClick={handleDeleteClass} className="p-3 bg-white text-red-500 rounded-xl shadow-sm"><Trash2 size={16}/></button>
        </div>
      </div>

      <div className="xl:col-span-12 space-y-6">
        {submissions.filter(sub => sub.students?.class_name === selectedClass).map(sub => (
          <div key={sub.id} className="bg-white p-8 rounded-[40px] shadow-lg border border-slate-50 relative group">
            <div className="flex justify-between mb-6">
              <div>
                <p className="font-black uppercase text-blue-600 text-sm">{sub.students?.full_name}</p>
                <p className="text-[10px] font-bold text-slate-300 italic">{sub.assignments?.prompt_text}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-blue-600">GRADE: {sub.final_score || sub.ai_score}/5</p>
                <input type="range" min="1" max="5" defaultValue={sub.final_score || sub.ai_score} onBlur={(e) => supabase.from('submissions').update({ final_score: e.target.value }).eq('id', sub.id)} className="w-32 accent-blue-600" />
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-slate-50 p-6 rounded-[32px]">
                <audio controls src={sub.audio_url} className="w-full mb-4 h-8" />
                <p className="text-xs text-slate-500 italic">"{sub.transcript || 'Wait for AI...'}"</p>
              </div>
              <div className="bg-blue-50 p-6 rounded-[32px] border border-blue-100">
                <p className="text-[10px] font-black text-blue-400 mb-2 uppercase">Feedback</p>
                <textarea defaultValue={sub.feedback || sub.teacher_score} onBlur={(e) => supabase.from('submissions').update({ feedback: e.target.value }).eq('id', sub.id)} className="w-full bg-transparent border-none text-sm font-bold text-blue-900 h-12 focus:ring-0" />
                <div className="flex items-center gap-3 mt-4 border-t border-blue-100 pt-4">
                  <button onClick={recId === sub.id ? () => {mediaRef.current.stop(); setRecId(null)} : () => startFeedbackRec(sub.id)} className={`p-3 rounded-xl ${recId === sub.id ? 'bg-black animate-pulse' : 'bg-red-500'} text-white`}>
                    {recId === sub.id ? <Square size={14}/> : <Mic size={14}/>}
                  </button>
                  <span className="text-[10px] font-black uppercase text-blue-300">{blobs[sub.id] ? "Voice Ready" : "Record Voice Feedback"}</span>
                </div>
              </div>
            </div>

            <button onClick={() => pushFinal(sub.id, sub.final_score || sub.ai_score, sub.feedback || sub.teacher_score)} className={`w-full p-4 rounded-2xl font-black text-[10px] uppercase shadow-md transition-all ${sub.status === 'graded' ? 'bg-green-500 text-white' : 'bg-slate-900 text-white hover:bg-blue-600'}`}>
              {sub.status === 'graded' ? 'GRADES PUSHED' : 'PUSH TO STUDENT'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
