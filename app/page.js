'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Mic, Square, Loader2, User, CheckCircle } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function StudentPage() {
  const [student, setStudent] = useState(null)
  const [assignment, setAssignment] = useState(null)
  const [loginName, setLoginName] = useState('')
  const [loginCode, setLoginCode] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  
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
    else alert("Login failed! Check your name and code.")
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorder.current = new MediaRecorder(stream)
      audioChunks.current = []
      mediaRecorder.current.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.current.push(e.data) }
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' })
        await uploadSubmission(audioBlob)
      }
      mediaRecorder.current.start()
      setIsRecording(true)
    } catch (err) { alert("Microphone blocked!") }
  }

  const stopRecording = () => {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop()
      setIsRecording(false)
      setIsUploading(true)
    }
  }

  const uploadSubmission = async (blob) => {
    const fileName = `${student.id}-${Date.now()}.webm`
    const { error: storageError } = await supabase.storage.from('student-audio').upload(fileName, blob)
    
    if (storageError) {
      alert("Upload failed. Make sure the storage bucket exists!")
      setIsUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('student-audio').getPublicUrl(fileName)

    const { error: dbError } = await supabase.from('submissions').insert([{
      student_id: student.id,
      assignment_id: assignment.id,
      audio_url: publicUrl
    }])

    if (dbError) alert("Database error saving audio.")
    else setSubmitted(true)
    setIsUploading(false)
  }

  if (!student) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
      <div className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-sm text-center">
        <h1 className="text-2xl font-black text-blue-600 mb-8 uppercase tracking-tighter">Student Login</h1>
        <input value={loginName} onChange={e => setLoginName(e.target.value)} placeholder="Full Name" className="w-full p-4 border rounded-2xl mb-3 font-bold text-sm" />
        <input value={loginCode} onChange={e => setLoginCode(e.target.value)} placeholder="Code (e.g. raul1)" className="w-full p-4 border rounded-2xl mb-6 font-bold text-sm" />
        <button onClick={handleLogin} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase tracking-widest text-xs">Enter Lab</button>
      </div>
    </div>
  )

  if (submitted) return (
    <div className="min-h-screen bg-green-500 flex flex-col items-center justify-center p-6 text-white text-center font-sans">
      <CheckCircle size={80} className="mb-4" />
      <h2 className="text-4xl font-black uppercase italic tracking-tighter">SENT!</h2>
      <p className="font-bold opacity-80">Your recording is in the Gemini Lab.</p>
      <button onClick={() => window.location.reload()} className="mt-8 underline font-bold opacity-70">Logout</button>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center font-sans">
      <div className="bg-white p-10 rounded-[40px] shadow-xl w-full max-w-lg text-center border border-slate-100">
        <div className="flex justify-between items-center mb-10">
           <span className="text-[10px] font-black uppercase text-blue-600 flex items-center gap-1"><User size={12}/> {student.full_name}</span>
           <button onClick={() => window.location.reload()} className="text-[10px] font-bold text-slate-300 uppercase underline">Logout</button>
        </div>
        {assignment ? (
          <>
            <div className="bg-slate-50 p-10 rounded-[32px] mb-10 border border-slate-100"><p className="text-xl font-bold text-slate-700 leading-tight">{assignment.prompt_text}</p></div>
            <div className="space-y-6">
              {isUploading ? (<div className="flex flex-col items-center gap-4"><Loader2 className="animate-spin text-blue-600" size={48} /><p className="text-[10px] font-black uppercase text-slate-400">Uploading to Gemini House...</p></div>) : !isRecording ? (
                <button onClick={startRecording} className="w-24 h-24 bg-red-500 text-white rounded-full flex items-center justify-center mx-auto shadow-2xl active:scale-95 transition-all"><Mic size={40} /></button>
              ) : (
                <button onClick={stopRecording} className="w-24 h-24 bg-slate-900 text-white rounded-full flex items-center justify-center mx-auto animate-pulse"><Square size={40} /></button>
              )}
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{isRecording ? "Tap to Finish" : "Tap to Speak"}</p>
            </div>
          </>
        ) : (
          <p className="p-20 text-slate-200 font-black text-xl uppercase italic">Waiting for teacher...</p>
        )}
      </div>
    </div>
  )
}