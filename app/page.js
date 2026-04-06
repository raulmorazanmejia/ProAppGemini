'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Mic, Square, CheckCircle, History, Lock, User, Loader2, Volume2, RefreshCw } from 'lucide-react'

const supabase = createClient(
  'https://cfpjjkfqkapamaulgysh.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmcGpqa2Zxa2FwYW1hdWxneXNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMDI5ODEsImV4cCI6MjA5MDU3ODk4MX0.AGm7hdpOxUYOu6q9BWjWeFWB1oMcp4ap-Wc1F9o-CT0'
)

export default function StudentGatekeeper() {
  const [assignment, setAssignment] = useState(null)
  const [studentCode, setStudentCode] = useState('')
  const [profile, setProfile] = useState(null)
  const [mySubmissions, setMySubmissions] = useState([])
  const [status, setStatus] = useState('idle')
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])

  useEffect(() => {
    const savedCode = localStorage.getItem('esl_student_code')
    if (savedCode) verifyCode(savedCode)
    
    async function getTask() {
      const { data } = await supabase.from('prompts').select('*').eq('is_active', true).limit(1).maybeSingle()
      if (data) setAssignment(data)
    }
    getTask()
  }, [])

  async function verifyCode(code) {
    const cleanCode = code.trim().toLowerCase()
    const { data } = await supabase.from('students').select('*').ilike('student_code', cleanCode).maybeSingle()
    if (data) {
        setProfile(data)
        localStorage.setItem('esl_student_code', cleanCode)
        loadHistory(data.full_name)
    } else if (code) { alert("Invalid code. Check with Professor Morazán."); }
  }

  async function loadHistory(name) {
    if (!name) return;
    const cleanName = name.trim();
    const { data } = await supabase.from('student_submissions')
        .ilike('student_name', cleanName)
        .order('created_at', { ascending: false })
    setMySubmissions(data || [])
  }

  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        mediaRecorder.current = new MediaRecorder(stream)
        audioChunks.current = []
        mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data)
        mediaRecorder.current.onstop = async () => {
            setStatus('uploading')
            const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' })
            const fileName = `${Date.now()}-${profile.full_name.replace(/\s+/g, '')}.webm`
            
            const { data: uploadData, error: uploadError } = await supabase.storage.from('Student-audio').upload(fileName, audioBlob)
            if (uploadError) return alert("Storage Error: " + uploadError.message)
            
            const publicUrl = `https://cfpjjkfqkapamaulgysh.supabase.co/storage/v1/object/public/Student-audio/${fileName}`
            const { error: dbError } = await supabase.from('student_submissions').insert([{ 
                student_name: profile.full_name.trim(), 
                prompt_text: assignment?.prompt_text || "General Task",
                audio_url: publicUrl,
                audio_path: fileName // Satisfies database constraint
            }])
            
            if (dbError) return alert("Database Error: " + dbError.message)
            
            setStatus('success')
            setTimeout(() => { setStatus('idle'); loadHistory(profile.full_name); }, 3000)
        }
        mediaRecorder.current.start()
        setStatus('recording')
    } catch (err) { alert("Microphone Error: Please allow access!") }
  }

  if (!profile) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
      <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-sm text-center">
        <Lock className="mx-auto mb-4 text-blue-600" size={40} />
        <h1 className="text-2xl font-bold mb-6 text-slate-800 text-sans">Class Login</h1>
        <input type="text" placeholder="Your Code" className="w-full p-4 border rounded-2xl mb-4 text-center font-bold text-slate-900 bg-slate-50 uppercase" 
               onChange={(e) => setStudentCode(e.target.value)} />
        <button onClick={() => verifyCode(studentCode)} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold hover:bg-blue-700 transition-all">Enter</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans text-slate-900">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center border relative overflow-hidden">
          <div className="absolute top-4 right-4 text-[10px] font-bold text-slate-300 uppercase flex items-center gap-1">
            <User size={12} /> {profile.full_name}
          </div>
          <h1 className="text-xl font-black mb-4 uppercase tracking-tight text-slate-400 font-sans">Current Task</h1>
          <p className="text-2xl font-bold text-slate-800 mb-8 italic">"{assignment?.prompt_text || "No active task..."}"</p>
          <button onClick={status === 'recording' ? () => mediaRecorder.current.stop() : startRecording} 
                  className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center text-white shadow-xl transition-all ${status === 'recording' ? 'bg-red-500 animate-pulse scale-110' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {status === 'uploading' ? <Loader2 className="animate-spin" size={36} /> : status === 'recording' ? <Square size={36} /> : <Mic size={36} />}
          </button>
        </div>

        <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 font-sans"><History size={14}/> My History</h2>
                <button onClick={() => loadHistory(profile.full_name)} className="text-blue-500 hover:rotate-180 transition-all duration-500">
                    <RefreshCw size={14} />
                </button>
            </div>
            <div className="space-y-4">
                {mySubmissions.map(s => (
                    <div key={s.id} className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col gap-5">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-bold text-slate-700 italic font-sans">"{s.prompt_text}"</p>
                          <span className="text-[10px] font-bold text-slate-300 uppercase font-sans">{new Date(s.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                            <div className="flex flex-col gap-2">
                                <span className="text-[10px] font-black uppercase text-slate-400 font-sans">My Voice</span>
                                <audio src={s.audio_url} controls className="w-full h-8" />
                            </div>
                            {s.feedback_url && (
                                <div className="bg-green-600 p-4 rounded-2xl flex flex-col gap-2 shadow-lg">
                                    <span className="text-[10px] font-black uppercase text-white flex items-center gap-1 font-sans"><Volume2 size={12}/> Professor Morazán's Feedback</span>
                                    <audio src={s.feedback_url} controls className="w-full h-8 invert" />
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  )
}
