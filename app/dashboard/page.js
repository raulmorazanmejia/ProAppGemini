'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Play, CheckCircle, Lock, Mic, Square, Volume2, UserPlus, Users, Trash2 } from 'lucide-react'

const supabase = createClient(
  'https://cfpjjkfqkapamaulgysh.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmcGpqa2Zxa2FwYW1hdWxneXNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMDI5ODEsImV4cCI6MjA5MDU3ODk4MX0.AGm7hdpOxUYOu6q9BWjWeFWB1oMcp4ap-Wc1F9o-CT0'
)

export default function TeacherDashboard() {
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [prompts, setPrompts] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [roster, setRoster] = useState([])
  const [newStudent, setNewStudent] = useState({ name: '', code: '' })
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
    const { data: sList } = await supabase.from('student_submissions').select('*').order('created_at', { ascending: false })
    const { data: rList } = await supabase.from('students').select('*').order('full_name', { ascending: true })
    setPrompts(pList || [])
    setSubmissions(sList || [])
    setRoster(rList || [])
  }

  const addStudent = async (e) => {
    e.preventDefault()
    if (!newStudent.name || !newStudent.code) return
    const { error } = await supabase.from('students').insert([{ full_name: newStudent.name, student_code: newStudent.code.toLowerCase() }])
    if (error) alert("Code already in use or error connecting.")
    else {
        setNewStudent({ name: '', code: '' })
        loadData()
    }
  }

  const deleteStudent = async (id) => {
    if (confirm("Remove student?")) {
        await supabase.from('students').delete().eq('id', id)
        loadData()
    }
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
        <h1 className="text-2xl font-bold mb-6 text-slate-800">Teacher Portal</h1>
        <input type="password" placeholder="Password" className="w-full p-4 border rounded-2xl mb-4 text-center text-slate-900" onChange={(e) => setPassword(e.target.value)} />
        <button className="w-full bg-slate-800 text-white p-4 rounded-2xl font-bold">Enter</button>
      </form>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ROSTER MANAGEMENT */}
        <div className="lg:col-span-3 bg-white p-8 rounded-3xl shadow-lg border">
          <div className="flex items-center gap-2 mb-6">
              <Users size={18} className="text-slate-400" />
              <h2 className="font-bold text-xs uppercase tracking-widest text-slate-400">Class Roster</h2>
          </div>
          <form onSubmit={addStudent} className="space-y-3 mb-6">
              <input type="text" placeholder="Student Name" className="w-full p-3 border rounded-xl text-sm" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} />
              <input type="text" placeholder="Code (e.g. maria1)" className="w-full p-3 border rounded-xl text-sm" value={newStudent.code} onChange={e => setNewStudent({...newStudent, code: e.target.value})} />
              <button className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors">Add Student</button>
          </form>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {roster.map(s => (
                  <div key={s.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border text-sm">
                      <span className="font-bold text-slate-700">{s.full_name} <span className="text-slate-300 font-normal ml-2">({s.student_code})</span></span>
                      <button onClick={() => deleteStudent(s.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                  </div>
              ))}
          </div>
        </div>

        {/* PROMPTS & SUBMISSIONS */}
        <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-lg border">
                <h2 className="font-bold text-xs uppercase tracking-widest text-slate-400 mb-6">Speaking Prompts</h2>
                <div className="space-y-3">
                  {prompts.map(p => (
                    <div key={p.id} onClick={() => togglePrompt(p.id, p.is_active)} className={`p-4 rounded-2xl border cursor-pointer flex justify-between items-center transition-all ${p.is_active ? 'bg-blue-50 border-blue-400' : 'bg-white hover:bg-slate-50'}`}>
                      <span className={`text-sm font-bold ${p.is_active ? 'text-blue-700' : 'text-slate-600'}`}>{p.prompt_text}</span>
                      {p.is_active && <CheckCircle className="text-blue-500" size={20} />}
                    </div>
                  ))}
                </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-lg border">
                <h2 className="font-bold text-xs uppercase tracking-widest text-slate-400 mb-6">Latest Work</h2>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {submissions.map((s) => (
                    <div key={s.id} className="p-4 bg-slate-50 rounded-2xl border">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-black text-slate-800 block text-sm">{s.student_name}</span>
                        <audio src={s.audio_url} controls className="h-8 w-32" />
                      </div>
                      <div className="flex items-center gap-2 bg-white p-2 rounded-lg border">
                          <button onClick={recordingId === s.id ? () => mediaRecorder.current.stop() : () => startFeedback(s.id)}
                            className={`p-2 rounded-full ${recordingId === s.id ? 'bg-red-500 animate-pulse' : 'bg-slate-800'} text-white`}>
                            {recordingId === s.id ? <Square size={12} /> : <Mic size={12} />}
                          </button>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                            {s.feedback_url ? 'Feedback Ready' : recordingId === s.id ? 'Recording...' : 'Record Feedback'}
                          </span>
                      </div>
                    </div>
                  ))}
                </div>
            </div>
        </div>

      </div>
    </div>
  )
}
