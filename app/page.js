'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Mic, Square, Award, CheckCircle, RotateCcw, Send, Volume2, Loader2, User } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function StudentPage() {
  const [student, setStudent] = useState(null); const [assignment, setAssignment] = useState(null);
  const [loginName, setLoginName] = useState(''); const [loginCode, setLoginCode] = useState('');
  const [isRecording, setIsRecording] = useState(false); const [previewUrl, setPreviewUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null); const [submission, setSubmission] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const mediaRef = useRef(null); const chunks = useRef([]);

  useEffect(() => {
    async function getActive() {
      const { data } = await supabase.from('assignments').select('*').eq('is_active', true).maybeSingle()
      setAssignment(data)
    }
    getActive()
  }, [])

  // REAL-TIME AUTO-REVEAL
  useEffect(() => {
    if (student && assignment) {
      const fetchSub = async () => {
        const { data } = await supabase.from('submissions').select('*').eq('student_id', student.id).eq('assignment_id', assignment.id).maybeSingle()
        setSubmission(data)
      }
      fetchSub()

      // This is the "Autopilot" listener
      const channel = supabase.channel(`live-session-${student.id}`).on('postgres_changes', { 
        event: 'UPDATE', schema: 'public', table: 'submissions', filter: `student_id=eq.${student.id}` 
      }, (payload) => {
          console.log("AI Status Update:", payload.new.status)
          setSubmission(payload.new)
      }).subscribe()
      
      return () => { supabase.removeChannel(channel) }
    }
  }, [student, assignment])

  const submit = async () => {
    setIsUploading(true)
    const name = `${student.id}-${Date.now()}.webm`
    await supabase.storage.from('student-audio').upload(name, audioBlob)
    const { data: { publicUrl } } = supabase.storage.from('student-audio').getPublicUrl(name)
    
    const { data } = await supabase.from('submissions').insert([{ 
      student_id: student.id, assignment_id: assignment.id, audio_url: publicUrl, status: 'submitted' 
    }]).select().single()
    
    setSubmission(data)
    
    // Trigger the Autopilot AI
    fetch('/api/analyze', { method: 'POST', body: JSON.stringify({ 
      submissionId: data.id, audioUrl: publicUrl, promptText: assignment.prompt_text, imagePromptUrl: assignment.image_prompt_url 
    })})
    setIsUploading(false)
  }

  if (!student) return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6">
      <div className="bg-white p-12 rounded-[50px] shadow-2xl w-full max-w-sm text-center">
        <h1 className="text-2xl font-black text-slate-900 mb-8 uppercase italic">Student Lab</h1>
        <input value={loginName} onChange={e => setLoginName(e.target.value)} placeholder="Full Name" className="w-full p-4 bg-slate-50 border-none rounded-2xl mb-3 font-bold" />
        <input value={loginCode} onChange={e => setLoginCode(e.target.value)} placeholder="Access Code" className="w-full p-4 bg-slate-50 border-none rounded-2xl mb-6 font-bold" />
        <button onClick={async () => {
          const { data } = await supabase.from('students').select('*').eq('full_name', loginName).eq('student_code', loginCode).maybeSingle()
          if (data) setStudent(data); else alert("Login failed.")
        }} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase shadow-lg shadow-blue-100">Enter Lab</button>
      </div>
    </div>
  )

  // VIEW: THE AUTOPILOT REVEAL
  if (submission?.status === 'graded') return (
    <div className="min-h-screen bg-[#22C55E] flex items-center justify-center p-6 text-center font-sans">
      <div className="bg-white p-10 rounded-[60px] shadow-2xl w-full max-w-lg text-slate-900 border-b-8 border-green-600">
        <Award size={60} className="text-green-500 mx-auto mb-4" />
        <div className="inline-block bg-slate-900 text-white px-8 py-2 rounded-2xl font-black text-3xl mb-8 italic tracking-tighter">SCORE: {submission.final_score}/5</div>
        <p className="text-xl font-bold mb-10 italic leading-relaxed text-slate-800">"{submission.feedback || 'Great session!'}"</p>
        <button onClick={() => window.location.reload()} className="w-full bg-green-500 text-white p-5 rounded-3xl font-black uppercase tracking-widest text-xs hover:scale-95 transition-all">Finish Session</button>
      </div>
    </div>
  )

  // VIEW: THE AI PROCESSING ROOM
  if (submission) return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6 text-white text-center font-sans">
      <div className="bg-white p-12 rounded-[60px] text-slate-900 max-w-sm">
        <div className="relative w-20 h-20 mx-auto mb-8">
            <CheckCircle size={80} className="text-blue-600 animate-pulse" />
        </div>
        <h2 className="text-2xl font-black uppercase mb-4 tracking-tighter italic">Voice Logged</h2>
        <p className="text-sm font-bold text-slate-400 italic mb-10">"The AI is analyzing your recording. Please wait about 10 seconds for your result."</p>
        <div className="flex items-center justify-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest">
            <Loader2 className="animate-spin" size={14}/> Processing with AI...
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="bg-white p-10 rounded-[60px] shadow-xl w-full max-w-2xl text-center border relative overflow-hidden">
        <div className="flex justify-between items-center mb-10 text-[10px] font-black uppercase text-blue-600 tracking-widest">
           <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full"><User size={12}/> {student.full_name}</div>
        </div>
        {assignment ? (
          <div className="space-y-8">
            <div className="bg-blue-600 text-white p-10 rounded-[45px] font-bold text-2xl shadow-xl italic">
               {assignment.image_prompt_url && <img src={assignment.image_prompt_url} className="w-full max-h-80 object-cover rounded-[35px] mb-8 border-4 border-white shadow-lg" />}
               "{assignment.prompt_text}"
            </div>
            {isUploading ? (
               <div className="flex flex-col items-center gap-4 py-10"><Loader2 className="animate-spin text-blue-600" size={60} /><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Syncing Audio...</p></div>
            ) : !previewUrl ? (
              <button onClick={isRecording ? () => mediaRef.current.stop() : () => {
                navigator.mediaDevices.getUserMedia({audio:true}).then(s => {
                    mediaRef.current = new MediaRecorder(s);
                    chunks.current = [];
                    mediaRef.current.ondataavailable = e => chunks.current.push(e.data);
                    mediaRef.current.onstop = () => {
                        const blob = new Blob(chunks.current, {type:'audio/webm'});
                        setAudioBlob(blob); setPreviewUrl(URL.createObjectURL(blob)); setIsRecording(false);
                    };
                    mediaRef.current.start(); setIsRecording(true);
                })
              }} className={`w-28 h-28 rounded-full flex items-center justify-center mx-auto transition-all ${isRecording ? 'bg-black animate-pulse' : 'bg-red-500 shadow-2xl shadow-red-100 hover:scale-105'}`}>
                {isRecording ? <Square size={36} className="text-white"/> : <Mic size={48} className="text-white"/>}
              </button>
            ) : (
              <div className="space-y-6">
                <audio controls src={previewUrl} className="w-full mb-6" />
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setPreviewUrl(null)} className="p-5 bg-slate-100 rounded-3xl font-black text-[10px] uppercase">Rerecord</button>
                  <button onClick={submit} className="p-5 bg-blue-600 text-white rounded-3xl font-black text-[10px] uppercase shadow-lg shadow-blue-100">Analyze Voice</button>
                </div>
              </div>
            )}
          </div>
        ) : <p className="p-20 text-slate-200 font-black italic">Waiting for teacher task...</p>}
      </div>
    </div>
  )
}