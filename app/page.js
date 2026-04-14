'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Mic, Square, Loader2, User, CheckCircle, Award, Play, RotateCcw, Send, LayoutList, Image as ImageIcon } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function StudentPage() {
  const [student, setStudent] = useState(null); const [assignment, setAssignment] = useState(null);
  const [loginName, setLoginName] = useState(''); const [loginCode, setLoginCode] = useState('');
  const [isRecording, setIsRecording] = useState(false); const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null); const [audioBlob, setAudioBlob] = useState(null);
  const [aiResult, setAiResult] = useState(null); const [finalResult, setFinalResult] = useState(null);
  
  const mediaRecorder = useRef(null); const audioChunks = useRef([]);

  useEffect(() => {
    async function getActiveTask() {
      const { data } = await supabase.from('assignments').select('*').eq('is_active', true).maybeSingle()
      if (data) setAssignment(data)
    }
    if (student) getActiveTask()
  }, [student])

  useEffect(() => {
    if (!student || !assignment) return
    const channel = supabase.channel(`graded-${student.id}`).on('postgres_changes', { 
      event: 'UPDATE', schema: 'public', table: 'submissions', filter: `student_id=eq.${student.id}` 
    }, (payload) => {
      if (payload.new.status === 'graded') setFinalResult(payload.new)
    }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [student, assignment])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorder.current = new MediaRecorder(stream)
      audioChunks.current = []; mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data)
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' })
        setAudioBlob(blob); setPreviewUrl(URL.createObjectURL(blob)); setIsRecording(false)
      }
      mediaRecorder.current.start(); setIsRecording(true)
    } catch (err) { alert("Mic Error!") }
  }

  const uploadSubmission = async () => {
    setIsUploading(true)
    const fileName = `${student.id}-${Date.now()}.webm`
    const { error: storageError } = await supabase.storage.from('student-audio').upload(fileName, audioBlob)
    if (storageError) { alert("Storage Error: Check if 'student-audio' bucket exists."); setIsUploading(false); return }
    
    const { data: { publicUrl } } = supabase.storage.from('student-audio').getPublicUrl(fileName)
    const { data: dbData } = await supabase.from('submissions').insert([{ student_id: student.id, assignment_id: assignment.id, audio_url: publicUrl, status: 'submitted' }]).select().single()

    await fetch('/api/analyze', { method: 'POST', body: JSON.stringify({ submissionId: dbData.id, audioUrl: publicUrl, promptText: assignment.prompt_text, imageUrl: assignment.image_prompt_url, rubric: assignment.rubric_focus }) })
    setAiResult(true); setIsUploading(false)
  }

  if (!student) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
      <div className="bg-white p-12 rounded-[50px] shadow-2xl w-full max-w-sm text-center">
        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8"><LayoutList size={40}/></div>
        <h1 className="text-2xl font-black text-slate-900 mb-8 uppercase tracking-tighter italic">Student Lab</h1>
        <input value={loginName} onChange={e => setLoginName(e.target.value)} placeholder="Full Name" className="w-full p-4 bg-slate-50 border-none rounded-2xl mb-3 font-bold text-sm" />
        <input value={loginCode} onChange={e => setLoginCode(e.target.value)} placeholder="Access Code" className="w-full p-4 bg-slate-50 border-none rounded-2xl mb-6 font-bold text-sm" />
        <button onClick={async () => {
          const { data } = await supabase.from('students').select('*').eq('full_name', loginName).eq('student_code', loginCode).maybeSingle()
          if (data) setStudent(data); else alert("Login failed!")
        }} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-900 transition-all">Enter Lab</button>
      </div>
    </div>
  )

  if (finalResult) return (
    <div className="min-h-screen bg-green-500 flex items-center justify-center p-6 text-white text-center font-sans">
      <div className="bg-white p-10 rounded-[50px] shadow-2xl w-full max-w-lg text-slate-900">
        <Award size={60} className="text-green-500 mx-auto mb-6" />
        <div className="inline-flex bg-slate-900 text-white px-6 py-2 rounded-2xl font-black text-2xl mb-8 tracking-tighter">SCORE: {finalResult.final_score}/5</div>
        <h2 className="text-2xl font-black text-slate-900 uppercase mb-4 tracking-tighter">Teacher Feedback</h2>
        <p className="text-lg font-bold leading-tight mb-8 italic">"{finalResult.feedback || 'Great job!'}"</p>
        <button onClick={() => window.location.reload()} className="w-full bg-green-500 text-white p-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-95 transition">Submit New Task</button>
      </div>
    </div>
  )

  if (aiResult) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white text-center font-sans">
      <div className="bg-white p-12 rounded-[50px] shadow-2xl w-full max-w-sm text-slate-900">
        <CheckCircle size={60} className="text-blue-600 mx-auto mb-6 animate-pulse" />
        <h2 className="text-2xl font-black text-slate-900 uppercase mb-4 tracking-tighter">Voice Sent!</h2>
        <p className="text-xs font-bold leading-tight mb-8 text-slate-400">Recording is in the Lab. Wait for the teacher to push your feedback.</p>
        <button onClick={() => window.location.reload()} className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black uppercase tracking-widest text-[10px]">Back</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="bg-white p-10 rounded-[50px] shadow-xl w-full max-w-2xl text-center border border-slate-100">
        <div className="flex justify-between items-center mb-10 text-[10px] font-black uppercase text-blue-600 tracking-widest"><User size={12}/> {student.full_name} ({student.class_name})</div>
        {assignment ? (
          <div className="space-y-8">
            <div className="bg-blue-600 text-white p-10 rounded-[40px] font-bold text-xl leading-snug shadow-xl shadow-blue-100 relative overflow-hidden">
               {assignment.image_prompt_url && <img src={assignment.image_prompt_url} alt="Visual Prompt" className="w-full max-h-72 object-cover rounded-3xl mb-6 border-4 border-white shadow-lg" />}
               <p className="relative z-10 italic">"{assignment.prompt_text}"</p>
            </div>
            {isUploading ? (
              <div className="flex flex-col items-center gap-4 py-10"><Loader2 className="animate-spin text-blue-600" size={48} /><p className="text-[10px] font-black uppercase text-slate-400">Processing Audio...</p></div>
            ) : !previewUrl ? (
              <div className="py-10">
                <button onClick={isRecording ? () => mediaRecorder.current.stop() : startRecording} className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto transition-all ${isRecording ? 'bg-black animate-pulse' : 'bg-red-500 shadow-2xl shadow-red-100 hover:scale-105'}`}>
                  {isRecording ? <Square size={32} className="text-white"/> : <Mic size={40} className="text-white"/>}
                </button>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-6">{isRecording ? "Listening..." : "Tap to Speak"}</p>
              </div>
            ) : (
              <div className="space-y-6 py-6 border-t border-slate-50">
                <audio controls src={previewUrl} className="w-full mb-4" />
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => {setPreviewUrl(null); setAudioBlob(null)}} className="p-4 bg-slate-100 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-slate-200 transition"><RotateCcw size={14}/> Try Again</button>
                  <button onClick={uploadSubmission} className="p-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-slate-900 transition shadow-lg shadow-blue-100"><Send size={14}/> Submit Recording</button>
                </div>
              </div>
            )}
          </div>
        ) : <p className="p-20 text-slate-300 font-black italic">No active task found.</p>}
      </div>
    </div>
  )
}
