'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Play, CheckCircle, Lock, Mic, Square, Volume2 } from 'lucide-react'

const supabase = createClient(
  'https://cfpjjkfqkapamaulgysh.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmcGpqa2Zxa2FwYW1hdWxneXNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMDI5ODEsImV4cCI6MjA5MDU3ODk4MX0.AGm7hdpOxUYOu6q9BWjWeFWB1oMcp4ap-Wc1F9o-CT0'
)

export default function TeacherDashboard() {
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [prompts, setPrompts] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [recordingId, setRecordingId] = useState(null)
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])

  const checkPassword = (e) => {
    e.preventDefault()
    if (password === 'LoneStarTeacher') setIsAuthenticated(true)
    else alert("Access Denied.")
  }

  useEffect(() => {
    if (isAuthenticated) loadData()
  }, [isAuthenticated])

  async function loadData() {
    const { data: pList } = await supabase.from('prompts').select('*').order('created_at', { ascending: false })
    setPrompts(pList || [])
    const { data: sList } = await supabase.from('student_submissions').select('*').order('created_at', { ascending: false })
    setSubmissions(sList || [])
  }

  const togglePrompt = async (id, currentStatus) => {
    await supabase.from('prompts').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('prompts').update({ is_active: !currentStatus }).eq('id', id)
    loadData()
  }

  const startFeedback = async (id) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder.current = new MediaRecorder(stream)
    audioChunks.current = []
    mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data)
    mediaRecorder.current.onstop = async () => {
      const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' })
      const fileName = `feedback-${id}-${Date.now()}.webm`
      const { data } = await supabase.storage.from('Student-audio').upload(fileName, audioBlob)
      if (data) {
        const url = `https://cfpjjkfqkapamaulgysh.supabase.co/storage/v1/object/public/Student-audio/${fileName}`
        await supabase.from('student_submissions').update({ feedback_url: url }).eq('id', id)
        loadData()
      }
      setRecordingId(null)
    }
    mediaRecorder.current.start()
    setRecordingId(id)
  }

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
      <form onSubmit={checkPassword} className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-sm text-center">
        <Lock className="mx-auto mb-4 text-slate-300" size={40} />
        <h1 className="text-2xl font-bold mb-6 text-slate-800">Teacher Office</h1>
        <input type="password" placeholder="Password" className="w-full p-4 border rounded-2xl mb-4 text-center text-slate-900" onChange={(e) => setPassword(e.target.value)} />
        <button className="w-full bg-slate-800 text-white p-4 rounded-2xl font-bold hover:bg-slate-700 transition-colors">Enter Dashboard</button>
      </form>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="bg-white p-8 rounded-3xl shadow-lg border">
          <h2 className="font-bold text-xs uppercase tracking-widest text-slate-400 mb-6 font-sans">Classroom Prompts</h2>
          <div className="space-y-3">
            {prompts.map(p => (
              <div key={p.id} onClick={() => togglePrompt(p.id, p.is_active)} className={`p-5 rounded-2xl border cursor-pointer flex justify-between items-center transition-all ${p.is_active ? 'bg-blue-50 border-blue-400' : 'bg-white hover:bg-slate-50'}`}>
                <span className={`text-sm font-bold ${p.is_active ? 'text-blue-700' : 'text-slate-600'}`}>{p.prompt_text}</span>
                {p.is_active && <CheckCircle className="text-blue-500" size={24} />}
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white p-8 rounded-3xl shadow-lg border">
          <h2 className="font-bold text-xs uppercase tracking-widest text-slate-400 mb-6 font-sans">Student Submissions</h2>
          <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2">
            {submissions.map((s) => (
              <div key={s.id} className="p-5 bg-slate-50 rounded-2xl border">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="font-black text-slate-800 block text-lg">{s.student_name}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter italic">"{s.prompt_text}"</span>
                  </div>
                  {s.feedback_url && <Volume2 className="text-green-500" size={20} />}
                </div>
                
                <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase font-sans">Student Recording</span>
                        <audio src={s.audio_url} controls className="w-full h-10" />
                    </div>

                    <div className="flex items-center gap-4 bg-white p-3 rounded-xl border">
                        <button 
                          onClick={recordingId === s.id ? () => mediaRecorder.current.stop() : () => startFeedback(s.id)}
                          className={`p-3 rounded-full ${recordingId === s.id ? 'bg-red-500 animate-pulse' : 'bg-slate-800'} text-white shadow-md`}
                        >
                          {recordingId === s.id ? <Square size={16} /> : <Mic size={16} />}
                        </button>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase font-sans">Your Feedback</span>
                            {s.feedback_url ? (
                                <audio src={s.feedback_url} controls className="h-8" />
                            ) : (
                                <span className="text-xs text-slate-400 italic">{recordingId === s.id ? 'Recording...' : 'No feedback yet'}</span>
                            )}
                        </div>
                    </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
