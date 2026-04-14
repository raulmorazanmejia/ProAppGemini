'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Mic, Square, Loader2, User, CheckCircle, Award, Play, RotateCcw, Send, LayoutList, Image as ImageIcon, Volume2, LogOut } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function StudentPage() {
  const [student, setStudent] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [loginName, setLoginName] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [submission, setSubmission] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // 1. Fetch the LIVE assignment immediately
  useEffect(() => {
    async function getActiveTask() {
      const { data } = await supabase.from('assignments').select('*').eq('is_active', true).maybeSingle()
      setAssignment(data)
    }
    getActiveTask()
  }, [])

  // 2. CHECK PERSISTENCE: If student logs in, find their existing work for THIS task
  useEffect(() => {
    if (student && assignment) {
      const checkPersistence = async () => {
        const { data } = await supabase.from('submissions')
          .select('*')
          .eq('student_id', student.id)
          .eq('assignment_id', assignment.id)
          .maybeSingle()
        setSubmission(data)
      }
      checkPersistence()

      // 3. REAL-TIME: Listen for the Teacher "PUSH"
      const channel = supabase.channel(`live-grades-${student.id}`).on('postgres_changes', { 
        event: 'UPDATE', schema: 'public', table: 'submissions', filter: `student_id=eq.${student.id}` 
      }, (payload) => {
        if (payload.new.assignment_id === assignment.id) setSubmission(payload.new)
      }).subscribe()
      
      return () => { supabase.removeChannel(channel) }
    }
  }, [student, assignment])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data)
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setPreviewUrl(URL.createObjectURL(blob))
        setIsRecording(false)
        setHasReviewed(false)
      }
      mediaRecorderRef.current.start()
      setIsRecording(true)
    } catch (err) { alert("Mic access denied!") }
  }

  const uploadSubmission = async () => {
    if (!hasReviewed) return alert("You must listen to your recording first!")
    setIsUploading(true)
    
    const fileName = `${student.id}-${Date.now()}.webm`
    const { error: storageError } = await supabase.storage.from('student-audio').upload(fileName, audioBlob)
    if (storageError) { alert("Upload failed!"); setIsUploading(false); return }
    
    const { data: { publicUrl } } = supabase.storage.from('student-audio').getPublicUrl(fileName)

    const { data: dbData } = await supabase.from('submissions').insert([{ 
      student_id: student.id, 
      assignment_id: assignment.id, 
      audio_url: publicUrl, 
      status: 'submitted' 
    }]).select().single()

    setSubmission(dbData)
    
    // Trigger AI
    fetch('/api/analyze', { 
      method: 'POST', 
      body: JSON.stringify({ 
        submissionId: dbData.id, 
        audioUrl: publicUrl, 
        promptText: assignment.prompt_text, 
        imagePromptUrl: assignment.image_prompt_url, 
        rubric: assignment.rubric_focus 
      }) 
    })
    setIsUploading(false)
  }

  // --- LOGIN UI ---
  if (!student) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
      <div className="bg-white p-12 rounded-[60px] shadow-2xl w-full max-w-sm text-center border-t-8 border-blue-600">
        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8"><LayoutList size={40}/></div>
        <h1 className="text-2xl font-black text-slate-900 mb-8 uppercase tracking-tighter italic">Student Lab</h1>
        <div className="space-y-4 mb-8">
          <input value={loginName} onChange={e => setLoginName(e.target.value)} placeholder="Full Name" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-600" />
          <input value={loginCode} onChange={e => setLoginCode(e.target.value)} placeholder="Access Code" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-600" />
        </div>
        <button onClick={async () => {
          const { data } = await supabase.from('students').select('*').eq('full_name', loginName).eq('student_code', loginCode).maybeSingle()
          if (data) setStudent(data); else alert("Login failed!")
        }} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-100">Enter Lab</button>
      </div>
    </div>
  )

  // --- GRADED UI (The Reveal) ---
  if (submission?.status === 'graded') return (
    <div className="min-h-screen bg-green-500 flex items-center justify-center p-6 text-center font-sans">
      <div className="bg-white p-10 rounded-[60px] shadow-2xl w-full max-w-lg text-slate-900">
        <Award size={60} className="text-green-500 mx-auto mb-6" />
        <div className="inline-flex bg-slate-900 text-white px-8 py-2 rounded-2xl font-black text-3xl mb-8 tracking-tighter italic">SCORE: {submission.final_score}/5</div>
        <h2 className="text-xl font-black text-slate-300 uppercase mb-4 tracking-widest">Teacher Feedback</h2>
        <p className="text-2xl font-bold leading-tight mb-8 text-slate-800">"{submission.feedback || submission.teacher_score}"</p>
        
        {submission.feedback_audio_url && (
          <div className="bg-slate-50 p-6 rounded-[40px] mb-8 border border-slate-100">
            <p className="text-[10px] font-black uppercase text-blue-400 mb-3 tracking-widest flex items-center justify-center gap-2"><Volume2 size={12}/> Listen to Teacher</p>
            <audio controls src={submission.feedback_audio_url} className="w-full h-8" />
          </div>
        )}
        
        <button onClick={() => window.location.reload()} className="w-full bg-green-500 text-white p-5 rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-green-600 transition shadow-xl shadow-green-100">Continue</button>
      </div>
    </div>
  )

  // --- SUBMITTED UI (The Wait) ---
  if (submission) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white text-center font-sans">
      <div className="bg-white p-12 rounded-[60px] shadow-2xl w-full max-w-sm text-slate-900">
        <CheckCircle size={80} className="text-blue-600 mx-auto mb-8 animate-pulse" />
        <h2 className="text-2xl font-black text-slate-900 uppercase mb-4 tracking-tighter italic">Voice Logged</h2>
        <p className="text-sm font-bold leading-relaxed mb-10 text-slate-400 italic">"Recording is in the lab. Your teacher is reviewing it now."</p>
        <button onClick={() => setStudent(null)} className="flex items-center gap-2 mx-auto text-[10px] font-black uppercase text-slate-300 hover:text-blue-600"><LogOut size={12}/> Logout</button>
      </div>
    </div>
  )

  // --- MAIN RECORDER UI ---
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="bg-white p-10 rounded-[60px] shadow-xl w-full max-w-2xl text-center border border-slate-100">
        <div className="flex justify-between items-center mb-10 text-[10px] font-black uppercase text-blue-600 tracking-widest">
          <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full"><User size={12}/> {student.full_name}</div>
          <div className="bg-slate-50 px-3 py-1.5 rounded-full text-slate-400">{student.class_name}</div>
        </div>

        {assignment ? (
          <div className="space-y-8">
            <div className="bg-blue-600 text-white p-10 rounded-[45px] font-bold text-2xl leading-snug shadow-2xl shadow-blue-100">
               {assignment.image_prompt_url && <img src={assignment.image_prompt_url} className="w-full max-h-80 object-cover rounded-[35px] mb-8 border-4 border-white shadow-lg" />}
               <p className="italic">"{assignment.prompt_text}"</p>
            </div>

            {isUploading ? (
              <div className="flex flex-col items-center gap-4 py-10"><Loader2 className="animate-spin text-blue-600" size={60} /><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Processing Voice...</p></div>
            ) : !previewUrl ? (
              <div className="py-10">
                <button onClick={isRecording ? () => mediaRecorderRef.current.stop() : startRecording} className={`w-28 h-28 rounded-full flex items-center justify-center mx-auto transition-all ${isRecording ? 'bg-black animate-pulse shadow-xl' : 'bg-red-500 shadow-2xl shadow-red-100 hover:scale-110 active:scale-95'}`}>
                  {isRecording ? <Square size={36} className="text-white"/> : <Mic size={48} className="text-white"/>}
                </button>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-8">{isRecording ? "Recording... Tap to Finish" : "Tap to Begin Speaking"}</p>
              </div>
            ) : (
              <div className="space-y-6 py-6 border-t border-slate-50 bg-slate-50/50 rounded-[40px] p-8">
                <div className="flex items-center justify-center gap-2 text-blue-600 mb-2"><Volume2 size={16}/><span className="text-[10px] font-black uppercase tracking-widest">Review Your Recording</span></div>
                <audio controls src={previewUrl} onPlay={() => setHasReviewed(true)} className="w-full mb-6 accent-blue-600" />
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => {setPreviewUrl(null); setAudioBlob(null)}} className="p-5 bg-white border border-slate-100 rounded-3xl font-black text-[11px] uppercase flex items-center justify-center gap-2 hover:bg-slate-50 transition-all text-slate-500 shadow-sm"><RotateCcw size={16}/> Rerecord</button>
                  <button onClick={uploadSubmission} className={`p-5 rounded-3xl font-black text-[11px] uppercase flex items-center justify-center gap-2 transition-all shadow-lg ${hasReviewed ? 'bg-blue-600 text-white shadow-blue-100 hover:bg-slate-900' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}><Send size={16}/> {hasReviewed ? 'Submit Recording' : 'Listen First'}</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-24 text-slate-200 font-black italic space-y-4">
            <LayoutList size={48} className="mx-auto opacity-20" />
            <p>Waiting for the teacher to push a task...</p>
          </div>
        )}
      </div>
    </div>
  )
}
