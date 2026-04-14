'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Mic, Square, Loader2, User, CheckCircle, Award, RotateCcw, Send, LayoutList, Volume2, LogOut } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function StudentPage() {
  const [student, setStudent] = useState(null); const [assignment, setAssignment] = useState(null);
  const [loginName, setLoginName] = useState(''); const [loginCode, setLoginCode] = useState('');
  const [isRecording, setIsRecording] = useState(false); const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null); const [audioBlob, setAudioBlob] = useState(null);
  const [submission, setSubmission] = useState(null); // The "Memory" of the session
  
  const mediaRecorderRef = useRef(null); const audioChunksRef = useRef([]);

  // Load Task and Listen for Changes
  useEffect(() => {
    async function getActiveTask() {
      const { data } = await supabase.from('assignments').select('*').eq('is_active', true).maybeSingle()
      setAssignment(data)
    }
    getActiveTask()
  }, [])

  // Check for existing work after login
  useEffect(() => {
    if (student && assignment) {
      const checkWork = async () => {
        const { data } = await supabase.from('submissions').select('*').eq('student_id', student.id).eq('assignment_id', assignment.id).maybeSingle()
        setSubmission(data)
      }
      checkWork()

      // Listen for when teacher pushes the grade
      const channel = supabase.channel(`live-${student.id}`).on('postgres_changes', { 
        event: 'UPDATE', schema: 'public', table: 'submissions', filter: `student_id=eq.${student.id}` 
      }, (payload) => setSubmission(payload.new)).subscribe()
      return () => supabase.removeChannel(channel)
    }
  }, [student, assignment])

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorderRef.current = new MediaRecorder(stream)
    audioChunksRef.current = []; mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data)
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      setAudioBlob(blob); setPreviewUrl(URL.createObjectURL(blob)); setIsRecording(false)
    }
    mediaRecorderRef.current.start(); setIsRecording(true)
  }

  const uploadSubmission = async () => {
    setIsUploading(true)
    const fileName = `${student.id}-${Date.now()}.webm`
    await supabase.storage.from('student-audio').upload(fileName, audioBlob)
    const { data: { publicUrl } } = supabase.storage.from('student-audio').getPublicUrl(fileName)

    const { data } = await supabase.from('submissions').insert([{ 
      student_id: student.id, assignment_id: assignment.id, audio_url: publicUrl, status: 'submitted' 
    }]).select().single()

    setSubmission(data)
    fetch('/api/analyze', { method: 'POST', body: JSON.stringify({ submissionId: data.id, audioUrl: publicUrl, promptText: assignment.prompt_text, imagePromptUrl: assignment.image_prompt_url, rubric: assignment.rubric_focus }) })
    setIsUploading(false)
  }

  if (!student) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="bg-white p-12 rounded-[50px] shadow-2xl w-full max-w-sm text-center border-t-8 border-blue-600">
        <LayoutList className="text-blue-600 mx-auto mb-6" size={50}/>
        <h1 className="text-2xl font-black text-slate-900 mb-8 uppercase italic">Student Login</h1>
        <input value={loginName} onChange={e => setLoginName(e.target.value)} placeholder="Full Name" className="w-full p-4 bg-slate-50 border-none rounded-2xl mb-3 font-bold" />
        <input value={loginCode} onChange={e => setLoginCode(e.target.value)} placeholder="Access Code" className="w-full p-4 bg-slate-50 border-none rounded-2xl mb-6 font-bold" />
        <button onClick={async () => {
          const { data } = await supabase.from('students').select('*').eq('full_name', loginName).eq('student_code', loginCode).maybeSingle()
          if (data) setStudent(data); else alert("Login Error")
        }} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase">Enter Lab</button>
      </div>
    </div>
  )

  if (submission?.status === 'graded') return (
    <div className="min-h-screen bg-green-500 flex items-center justify-center p-6 text-center">
      <div className="bg-white p-10 rounded-[60px] shadow-2xl w-full max-w-lg text-slate-900">
        <Award size={60} className="text-green-500 mx-auto mb-6" />
        <div className="inline-block bg-slate-900 text-white px-8 py-2 rounded-2xl font-black text-3xl mb-8 italic">SCORE: {submission.final_score}/5</div>
        <p className="text-2xl font-bold mb-8 italic">"{submission.feedback || submission.teacher_score}"</p>
        {submission.feedback_audio_url && <audio controls src={submission.feedback_audio_url} className="w-full mb-8" />}
        <button onClick={() => window.location.reload()} className="w-full bg-green-500 text-white p-5 rounded-3xl font-black uppercase">Next Task</button>
      </div>
    </div>
  )

  if (submission) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white text-center">
      <div className="bg-white p-12 rounded-[60px] text-slate-900 max-w-sm">
        <CheckCircle size={80} className="text-blue-600 mx-auto mb-8 animate-pulse" />
        <h2 className="text-2xl font-black uppercase mb-4 tracking-tighter">Voice Logged</h2>
        <p className="text-sm font-bold text-slate-400 mb-10 italic">"Recording is in the lab. Your teacher is reviewing it now."</p>
        <button onClick={() => setStudent(null)} className="flex items-center gap-2 mx-auto text-[10px] font-black uppercase text-slate-300"><LogOut size={12}/> Logout</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="bg-white p-10 rounded-[60px] shadow-xl w-full max-w-2xl text-center border border-slate-100">
        <div className="flex justify-between items-center mb-10 text-[10px] font-black uppercase text-blue-600 tracking-widest">
           <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full"><User size={12}/> {student.full_name}</div>
        </div>
        {assignment ? (
          <div className="space-y-8">
            <div className="bg-blue-600 text-white p-10 rounded-[45px] font-bold text-2xl shadow-2xl">
               {assignment.image_prompt_url && <img src={assignment.image_prompt_url} className="w-full max-h-80 object-cover rounded-[35px] mb-8 border-4 border-white shadow-lg" />}
               <p className="italic">"{assignment.prompt_text}"</p>
            </div>
            {!previewUrl ? (
              <div className="py-10">
                <button onClick={isRecording ? () => mediaRecorderRef.current.stop() : startRecording} className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto ${isRecording ? 'bg-black animate-pulse' : 'bg-red-500'}`}>
                  {isRecording ? <Square size={36} className="text-white"/> : <Mic size={48} className="text-white"/>}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <audio controls src={previewUrl} className="w-full mb-6" />
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setPreviewUrl(null)} className="p-5 bg-slate-100 rounded-3xl font-black text-[10px] uppercase">Rerecord</button>
                  <button onClick={uploadSubmission} className="p-5 bg-blue-600 text-white rounded-3xl font-black text-[10px] uppercase shadow-lg shadow-blue-100">Submit</button>
                </div>
              </div>
            )}
          </div>
        ) : <p className="p-20 text-slate-200 font-black italic">Waiting for teacher...</p>}
      </div>
    </div>
  )
}
