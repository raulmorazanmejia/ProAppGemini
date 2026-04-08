'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { CheckCircle, Lock, Mic, Square, Trash2, User, Volume2, Send, RotateCcw, BrainCircuit } from 'lucide-react'

const supabase = createClient(
  'https://cfpjjkfqkapamaulgysh.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmcGpqa2Zxa2FwYW1hdWxneXNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMDI5ODEsImV4cCI6MjA5MDU3ODk4MX0.AGm7hdpOxUYOu6q9BWjWeFWB1oMcp4ap-Wc1F9o-CT0'
)

export default function TeacherDashboard() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [prompts, setPrompts] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [roster, setRoster] = useState([])
  const [newStudent, setNewStudent] = useState({ name: '', code: '' })
  const [recordingId, setRecordingId] = useState(null)
  const [previewAudio, setPreviewAudio] = useState(null) 
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setIsAuthenticated(true)
    })
  }, [])

  useEffect(() => {
    if (isAuthenticated) loadData()
  }, [isAuthenticated])

  async function loadData() {
    const { data: pList } = await supabase.from('prompts').select('*').order('created_at', { ascending: false })
    const { data: sList } = await supabase.from('flair_submissions').select('*').order('created_at', { ascending: false })
    const { data: rList } = await supabase.from('flair_students').select('*').order('full_name', { ascending: true })
    setPrompts(pList || [])
    setSubmissions(sList || [])
    setRoster(rList || [])
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert("Login failed: " + error.message)
    else setIsAuthenticated(true)
  }

  const addStudent = async (e) => {
    e.preventDefault()
    if (!newStudent.name || !newStudent.code) return
    const { error } = await supabase.from('flair_students').insert([{ 
        full_name: newStudent.name.trim().toLowerCase(), 
        student_code: newStudent.code.toLowerCase().trim() 
    }])
    if (error) alert("Error adding student. Code taken?")
    else { setNewStudent({ name: '', code: '' }); loadData(); }
  }

  const deleteStudent = async (id, name) => {
    if (confirm(`Remove ${name} and all their submissions?`)) {
      const { data: studentSubs } = await supabase.from('flair_submissions').select('audio_url, feedback_url').eq('student_name', name);
      const pathsToDelete = [];
      studentSubs?.forEach(sub => {
        if (sub.audio_url) pathsToDelete.push(sub.audio_url.split('/').pop().split('?')[0]);
        if (sub.feedback_url) pathsToDelete.push(sub.feedback_url.split('/').pop().split('?')[0]);
      });
      if (pathsToDelete.length > 0) {
        await supabase.storage.from('Student-audio').remove(pathsToDelete);
        await supabase.storage.from('teacher-audio').remove(pathsToDelete);
      }
      await supabase.from('flair_submissions').delete().eq('student_name', name);
      await supabase.from('flair_students').delete().eq('id', id);
      loadData(); 
    }
  }

  const togglePrompt = async (id, currentStatus) => {
    await supabase.from('prompts').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('prompts').update({ is_active: !currentStatus }).eq('id', id)
    loadData()
  }

  const updateManualGrade = async (id, score) => {
    const { error } = await supabase
      .from('flair_submissions')
      .update({ teacher_score: parseInt(score) })
      .eq('id', id);
    
    if (error) alert("Error updating grade: " + error.message);
    else loadData(); 
  }

  const startFeedback = async (id) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder.current = new MediaRecorder(stream)
    audioChunks.current = []
    mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data)
    mediaRecorder.current.onstop = () => {
      const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' })
      const localUrl = URL.createObjectURL(audioBlob)
      setPreviewAudio({ id, blob: audioBlob, url: localUrl })
      setRecordingId(null)
    }
    mediaRecorder.current.start()
    setRecordingId(id)
  }

  const pushFeedback = async () => {
    if (!previewAudio) return
    const { id, blob } = previewAudio
    const fileName = `feedback-${id}-${Date.now()}.webm`
    
    const { data, error: uploadError } = await supabase.storage.from('teacher-audio').upload(fileName, blob)
    if (uploadError) {
      alert("Upload Failed: " + uploadError.message)
      return
    }

    const url = `https://cfpjjkfqkapamaulgysh.supabase.co/storage/v1/object/public/teacher-audio/${fileName}`
    const { error: dbError } = await supabase.from('flair_submissions').update({ feedback_url: url }).eq('id', id)
    
    if (dbError) alert("Database Error: " + dbError.message)
    setPreviewAudio(null)
    loadData()
  }

  const deleteFeedback = async (id, feedbackUrl) => {
    if (confirm("Delete this feedback and record a new one?")) {
      const fileName = feedbackUrl.split('/').pop().split('?')[0];
      await supabase.storage.from('teacher-audio').remove([fileName]);
      await supabase.from('flair_submissions').update({ feedback_url: null }).eq('id', id);
      loadData();
    }
  }

  const handleDeleteSubmission = async (id, audioUrl, feedbackUrl) => {
    if (confirm("Delete this submission entirely?")) {
      if (audioUrl) await supabase.storage.from('Student-audio').remove([audioUrl.split('/').pop().split('?')[0]]);
      if (feedbackUrl) await supabase.storage.from('teacher-audio').remove([feedbackUrl.split('/').pop().split('?')[0]]);
      await supabase.from('flair_submissions').delete().eq('id', id);
      loadData();
    }
  }

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-slate-900">
      <form onSubmit={handleLogin} className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-sm text-center">
        <Lock className="mx-auto mb-4 text-blue-600" size={40} />
        <h1 className="text-2xl font-bold mb-6">Teacher Login</h1>
        <input type="email" placeholder="Email" className="w-full p-4 border rounded-2xl mb-4 text-center font-bold" onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" className="w-full p-4 border rounded-2xl mb-4 text-center font-bold" onChange={(e) => setPassword(e.target.value)} />
        <button className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold">Enter</button>
      </form>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 text-slate-900 font-sans">
      <div className="max-w-7xl mx-auto mb-6 flex justify-end">
        <button onClick={async () => { await supabase.auth.signOut(); setIsAuthenticated(false); }} className="text-sm font-bold text-slate-400 hover:text-red-500 transition-colors">Logout</button>
      </div>
      
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ROSTER */}
        <div className="lg:col-span-3 bg-white p-8 rounded-3xl shadow-lg border">
          <h2 className="font-bold text-xs uppercase tracking-widest text-slate-400 mb-6">Class Roster</h2>
          <form onSubmit={addStudent} className="space-y-3 mb-6">
              <input type="text" placeholder="Name" className="w-full p-3 border rounded-xl text-sm" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} />
              <input type="text" placeholder="Code" className="w-full p-3 border rounded-xl text-sm" value={newStudent.code} onChange={e => setNewStudent({...newStudent, code: e.target.value})} />
              <button className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold text-sm shadow-md">Add Student</button>
          </form>
          <div className="space-y-2 max-h-[400px] overflow-y-auto text-xs">
              {roster.map(s => (
                  <div key={s.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border">
                      <span className="font-bold">{s.full_name} <span className="opacity-30">({s.student_code})</span></span>
                      <button onClick={() => deleteStudent(s.id, s.full_name)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                  </div>
              ))}
          </div>
        </div>

        {/* TASKS */}
        <div className="lg:col-span-3 bg-white p-8 rounded-3xl shadow-lg border">
            <h2 className="font-bold text-xs uppercase tracking-widest text-slate-400 mb-6">Active Tasks</h2>
            <div className="space-y-3">
              {prompts.map(p => (
                <div key={p.id} onClick={() => togglePrompt(p.id, p.is_active)} className={`p-4 rounded-2xl border cursor-pointer flex justify-between items-center ${p.is_active ? 'bg-blue-50 border-blue-400' : 'bg-white hover:bg-slate-50'}`}>
                  <span className="text-sm font-bold">{p.prompt_text}</span>
                  {p.is_active && <CheckCircle className="text-blue-500" size={20} />}
                </div>
              ))}
            </div>
        </div>

        {/* STUDENT WORK */}
        <div className="lg:col-span-6 bg-white p-8 rounded-3xl shadow-lg border">
            <h2 className="font-bold text-xs uppercase tracking-widest text-slate-400 mb-6 text-center">Student Submissions</h2>
            <div className="space-y-6 max-h-[700px] overflow-y-auto pr-2">
              {submissions.map((s) => (
                <div key={s.id} className="p-6 bg-white rounded-2xl border-2 border-slate-100 shadow-sm hover:border-blue-100 transition-colors">
                  
                  {/* Header: Student & Audio */}
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <User size={16}/>
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-sm uppercase">{s.student_name}</p>
                        <p className="text-[10px] text-slate-400 font-bold italic">{s.prompt_text}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <audio src={s.audio_url} controls className="h-8 w-40" />
                      <button onClick={() => handleDeleteSubmission(s.id, s.audio_url, s.feedback_url)} className="text-slate-200 hover:text-red-500"><Trash2 size={16}/></button>
                    </div>
                  </div>

                  {/* AI Results Block */}
                  {s.transcript && (
                    <div className="mb-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-1">
                          <BrainCircuit size={12}/> AI Analysis
                        </span>
                        <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold italic">AI Score: {s.ai_score}/5</span>
                      </div>
                      <p className="text-xs italic text-slate-500 leading-relaxed">"{s.transcript}"</p>
                      <p className="text-xs font-bold text-slate-700">{s.ai_comment}</p>
                    </div>
                  )}

                  {/* Teacher Grade Slider */}
                  <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black uppercase text-slate-400">Teacher Override</span>
                      <span className="text-lg font-black text-blue-600">{s.teacher_score || '-'} / 5</span>
                    </div>
                    <input 
                      type="range" min="1" max="5" step="1"
                      value={s.teacher_score || 0}
                      onChange={(e) => updateManualGrade(s.id, e.target.value)}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-[8px] font-bold text-slate-300 px-1 mt-1 uppercase tracking-tighter">
                      <span>Awful</span><span>Weak</span><span>Okay</span><span>Good</span><span>Perfect</span>
                    </div>
                  </div>

                  {/* Feedback Action Area */}
                  <div className="pt-4 border-t border-slate-100">
                    {s.feedback_url ? (
                        <div className="bg-blue-600 p-4 rounded-xl shadow-lg space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">My Recorded Feedback</span>
                                <button onClick={() => deleteFeedback(s.id, s.feedback_url)} className="text-blue-200 hover:text-white"><Trash2 size={14}/></button>
                            </div>
                            <audio src={s.feedback_url} controls className="h-8 w-full invert" />
                        </div>
                    ) : (
                      <div className="space-y-3">
                        {previewAudio?.id === s.id ? (
                          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-3">
                            <span className="text-[10px] font-black uppercase text-amber-600 block text-center">Listen Before Sending</span>
                            <audio src={previewAudio.url} controls className="w-full h-8" />
                            <div className="flex gap-2">
                              <button onClick={() => setPreviewAudio(null)} className="flex-1 bg-white border border-slate-200 text-slate-700 p-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-sm"><RotateCcw size={12}/> Redo</button>
                              <button onClick={pushFeedback} className="flex-[2] bg-green-600 text-white p-3 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1"><Send size={12}/> Push to Student</button>
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={recordingId === s.id ? () => mediaRecorder.current.stop() : () => startFeedback(s.id)}
                            className={`w-full flex items-center justify-center gap-2 p-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${recordingId === s.id ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 text-white hover:bg-slate-900 shadow-md'}`}>
                            {recordingId === s.id ? <Square size={14} fill="white"/> : <Mic size={14} />}
                            {recordingId === s.id ? 'Stop & Review' : 'Record Feedback'}
                          </button>
                        )}
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