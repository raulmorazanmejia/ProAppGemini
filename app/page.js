'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Mic, Square, CloudUpload, User } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function StudentPage() {
  const [student, setStudent] = useState(null)
  const [assignment, setAssignment] = useState(null)
  const [loginName, setLoginName] = useState('')
  const [loginCode, setLoginCode] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const getTask = async () => {
      const { data } = await supabase.from('assignments').select('*').eq('is_active', true).single()
      setAssignment(data)
    }
    getTask()
  }, [])

  const handleLogin = async () => {
    const { data } = await supabase.from('students').select('*').eq('full_name', loginName).eq('student_code', loginCode).single()
    if (data) setStudent(data)
    else alert("Login failed. Check your name and code!")
  }

  // --- RECORDING LOGIC ---
  let mediaRecorder;
  let audioChunks = [];

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: 'audio/mpeg' });
      setAudioUrl(URL.createObjectURL(blob));
    };
    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    setIsRecording(false);
    // Note: In a real app, mediaRecorder would be stored in a Ref to call .stop()
    alert("Recording stopped. Ready to upload!");
  };

  if (!student) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-sm text-center">
        <h1 className="text-2xl font-black text-blue-600 tracking-tighter mb-8">STUDENT LOGIN</h1>
        <input value={loginName} onChange={e => setLoginName(e.target.value)} placeholder="Full Name" className="w-full p-4 border rounded-2xl mb-3 font-bold text-sm" />
        <input value={loginCode} onChange={e => setLoginCode(e.target.value)} placeholder="Code (e.g. a10)" className="w-full p-4 border rounded-2xl mb-6 font-bold text-sm" />
        <button onClick={handleLogin} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase tracking-widest text-xs">Enter Lab</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
      <div className="bg-white p-8 rounded-[40px] shadow-xl w-full max-w-lg text-center border border-slate-100">
        <div className="flex justify-between items-center mb-8">
           <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Lab Active</span>
           <span className="text-[10px] font-black uppercase text-blue-600 flex items-center gap-1"><User size={10}/> {student.full_name}</span>
        </div>
        
        {assignment ? (
          <>
            <div className="bg-slate-50 p-8 rounded-3xl mb-8 border border-slate-100">
              <p className="text-lg font-bold text-slate-700 leading-tight">{assignment.prompt_text}</p>
            </div>

            <div className="space-y-4">
              {!isRecording ? (
                <button onClick={startRecording} className="w-20 h-20 bg-red-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-red-200 active:scale-90 transition">
                  <Mic size={32} />
                </button>
              ) : (
                <button onClick={stopRecording} className="w-20 h-20 bg-slate-900 text-white rounded-full flex items-center justify-center mx-auto animate-pulse">
                  <Square size={32} />
                </button>
              )}
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {isRecording ? "Recording..." : "Tap to Speak"}
              </p>
            </div>
          </>
        ) : (
          <p className="p-10 text-slate-300 font-bold italic">Waiting for teacher...</p>
        )}
      </div>
    </div>
  )
}