'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Mic, Square, Loader2, User, CheckCircle, Award } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function StudentPage() {
  const [student, setStudent] = useState(null)
  const [assignment, setAssignment] = useState(null)
  const [loginName, setLoginName] = useState('')
  const [loginCode, setLoginCode] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])

  useEffect(() => {
    const getTask = async () => {
      const { data } = await supabase.from('assignments').select('*').eq('is_active', true).maybeSingle()
      setAssignment(data)
    }
    getTask()
  }, [])

  const handleLogin = async () => {
    const { data } = await supabase.from('students').select('*').eq('full_name', loginName).eq('student_code', loginCode).maybeSingle()
    if (data) setStudent(data)
    else alert("Login failed! Check your Name and Code.")
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorder.current = new MediaRecorder(stream)
      audioChunks.current = []
      mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data)
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' })
        await uploadSubmission(audioBlob)
      }
      mediaRecorder.current.start()
      setIsRecording(true)
    } catch (err) { alert("Microphone blocked!") }
  }

  const uploadSubmission = async (blob) => {
    setIsUploading(true)
    const fileName = `${student.id}-${Date.now()}.webm`
    const { error: storageError } = await supabase.storage.from('student-audio').upload(fileName, blob)
    
    if (storageError) {
      alert("Upload failed.")
      setIsUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('student-audio').getPublicUrl(fileName)

    const { data: dbData, error: dbError } = await supabase.from('submissions').insert([{
      student_id: student.id,
      assignment_id: assignment.id,
      audio_url: publicUrl
    }]).select().single()

    if (!dbError) {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ submissionId: dbData.id, audioUrl: publicUrl, promptText: assignment.prompt_text })
      })
      const data = await res.json()
      setAiResult(data)
    }
    setIsUploading(false)
  }

  // UI: LOGIN
  if (!student) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
      <div className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-sm text-center">
        <h1 className="text-2xl font-black text-blue-600 mb-8 uppercase tracking-tighter">Student Login</h1>
        <input value={loginName} onChange={e => setLoginName(e.target.value)} placeholder="Full Name" className="w-full p-4 border rounded-2xl mb-3 font-bold text-sm" />
        <input value={loginCode} onChange={e => setLoginCode(e.target.value)} placeholder="Code" className="w-full p-4 border rounded-2xl mb-6 font-bold text-sm" />
        <button onClick={handleLogin} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase tracking-widest text-xs">Enter Lab</button>
      </div>
    </div>
  )

  // UI: INSTANT FEEDBACK REVEAL
  if (aiResult) return (
    <div className="min-h-screen bg-blue-600 flex items-center justify-center p-6 font-sans text-white text-center">
      <div className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-lg text-slate-900">
        <div className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-2xl font-black text-xl mb-6">
          <Award size={24} /> SCORE: {aiResult.ai_score}/5
        </div>
        <h2 className="text-2xl font-black uppercase mb-4 tracking-tighter text-blue-600">Teacher Feedback</h2>
        <p className="text-lg font-bold leading-tight mb-8">"{aiResult.ai_comment}"</p>
        
        <div className="bg-slate-50 p-6 rounded-3xl mb-8 border border-slate-100 text-left">
          <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Transcript</p>
          <p className="text-xs text-slate-600 italic">"{aiResult.transcript}"</p>
        </div>

        <button onClick={() => window.location.reload()} className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black uppercase tracking-widest text-xs">Try Another Task</button>
      </div>
    </div>
  )

  // UI: RECORDER
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="bg-white p-10 rounded-[40px] shadow-xl w-full max-w-lg text-center border border-slate-100">
        <div className="flex justify-between items-center mb-10">
           <span className="text-[10px] font-black uppercase text-blue-600 flex items-center gap-1"><User size={12}/> {student.full_name}</span>
           <button onClick={() => window.location.reload()} className="text-[10px] font-bold text-slate-300 uppercase underline">Logout</button>
        </div>
        {assignment ? (
          <>
            <div className="bg-slate-50 p-10 rounded-[32px] mb-10 border border-slate-100 font-bold text-slate-700 text-xl leading-tight">{assignment.prompt_text}</div>
            <div className="space-y-6">
              {isUploading ? (<div className="flex flex-col items-center gap-4"><Loader2 className="animate-spin text-blue-600" size={48} /><p className="text-[10px] font-black uppercase text-slate-400">Gemini is listening...</p></div>) : !isRecording ? (
                <button onClick={startRecording} className="w-24 h-24 bg-red-500 text-white rounded-full flex items-center justify-center mx-auto shadow-2xl active:scale-95 transition-all"><Mic size={40} /></button>
              ) : (
                <button onClick={() => mediaRecorder.current.stop() || setIsRecording(false)} className="w-24 h-24 bg-slate-900 text-white rounded-full flex items-center justify-center mx-auto animate-pulse"><Square size={40} /></button>
              )}
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{isRecording ? "Tap to Finish" : "Tap to Speak"}</p>
            </div>
          </>
        ) : <p className="p-20 text-slate-300 font-black italic">Waiting for teacher...</p>}
      </div>
    </div>
  )
}