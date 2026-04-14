'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Mic, Square, Loader2, User, CheckCircle, Award, Play, RotateCcw, Send, LayoutList, Image as ImageIcon, Volume2 } from 'lucide-react'

// Initialize Supabase
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function StudentPage() {
  const [student, setStudent] = useState(null)
  const [assignment, setAssignment] = useState(null)
  const [loginName, setLoginName] = useState('')
  const [loginCode, setLoginCode] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [audioBlob, setAudioBlob] = useState(null)
  const [hasReviewed, setHasReviewed] = useState(false) // Requirement: Review before submit
  const [statusMessage, setStatusMessage] = useState(null)
  const [finalResult, setFinalResult] = useState(null)
  
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  // 1. Fetch the ONE active assignment
  useEffect(() => {
    async function getActiveTask() {
      const { data } = await supabase.from('assignments').select('*').eq('is_active', true).maybeSingle()
      if (data) setAssignment(data)
    }
    if (student) getActiveTask()
  }, [student])

  // 2. Real-time Listener: Listen for teacher "PUSH"
  useEffect(() => {
    if (!student || !assignment) return
    
    const channel = supabase.channel(`graded-${student.id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'submissions', 
        filter: `student_id=eq.${student.id}` 
      }, (payload) => {
        // Only show if the teacher marked it as 'graded'
        if (payload.new.status === 'graded' && payload.new.assignment_id === assignment.id) {
          setFinalResult(payload.new)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [student, assignment])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setPreviewUrl(URL.createObjectURL(blob))
        setIsRecording(false)
        setHasReviewed(false) // Reset review status for new recording
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
    } catch (err) {
      alert("Microphone access denied. Please check your browser settings.")
    }
  }

  const uploadSubmission = async () => {
    if (!hasReviewed) return alert("Please listen to your recording before submitting!")
    
    setIsUploading(true)
    const fileName = `${student.id}-${Date.now()}.webm`
    
    // Upload to 'student-audio' bucket
    const { error: storageError } = await supabase.storage.from('student-audio').upload(fileName, audioBlob)
    if (storageError) {
      alert("Error saving audio. Ensure 'student-audio' bucket exists in Supabase.")
      setIsUploading(false)
      return
    }
    
    const { data: { publicUrl } } = supabase.storage.from('student-audio').getPublicUrl(fileName)

    // Insert submission record
    const { data: dbData, error: dbError } = await supabase.from('submissions').insert([{ 
      student_id: student.id, 
      assignment_id: assignment.id, 
      audio_url: publicUrl, 
      status: 'submitted' 
    }]).select().single()

    if (!dbError) {
      // Trigger AI Analysis in the background
      fetch('/api/analyze', { 
        method: 'POST', 
        body: JSON.stringify({ 
          submissionId: dbData.id, 
          audioUrl: publicUrl, 
          promptText: assignment.prompt_text, 
          imagePromptUrl: assignment.image_prompt_url, // Multimodal support
          rubric: assignment.rubric_focus 
        }) 
      })
      setStatusMessage("Voice sent to the Lab! Waiting for teacher review.")
    }
    setIsUploading(false)
  }

  // --- UI: LOGIN ---
  if (!student) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
      <div className="bg-white p-12 rounded-[50px] shadow-2xl w-full max-w-sm text-center border-t-8 border-blue-600">
        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
          <LayoutList size={40}/>
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-8 uppercase tracking-tighter italic">Enter Lab</h1>
        <div className="space-y-4 mb-8">
          <input value={loginName} onChange={e => setLoginName(e.target.value)} placeholder="Full Name" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-600 transition-all" />
          <input value={loginCode} onChange={e => setLoginCode(e.target.value)} placeholder="Access Code" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-600 transition-all" />
        </div>
        <button onClick={async () => {
          const { data } = await supabase.from('students').select('*').eq('full_name', loginName).eq('student_code', loginCode).maybeSingle()
          if (data) setStudent(data)
          else alert("Student details not found. Contact your teacher.")
        }} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-900 transition-all shadow-lg shadow-blue-200">Start Session</button>
      </div>
    </div>
  )

  // --- UI: GRADED REVEAL (POST-PUSH) ---
  if (finalResult) return (
    <div className="min-h-screen bg-green-500 flex items-center justify-center p-6 text-center font-sans">
      <div className="bg-white p-10 rounded-[60px] shadow-2xl w-full max-w-lg text-slate-900 border-b-8 border-green-600">
        <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Award size={60} />
        </div>
        <div className="inline-flex bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-3xl mb-8 tracking-tighter">
          SCORE: {finalResult.final_score}/5
        </div>
        <h2 className="text-xl font-black text-slate-400 uppercase mb-4 tracking-widest">Teacher Feedback</h2>
        <p className="text-2xl font-bold leading-tight mb-10 italic text-slate-800">"{finalResult.feedback || 'Excellent work in the lab today!'}"</p>
        <button onClick={() => window.location.reload()} className="w-full bg-green-500 text-white p-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-95 transition-all shadow-xl shadow-green-100">Finish Task</button>
      </div>
    </div>
  )

  // --- UI: WAITING FOR TEACHER ---
  if (statusMessage) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white text-center font-sans">
      <div className="bg-white p-12 rounded-[50px] shadow-2xl w-full max-w-sm text-slate-900">
        <CheckCircle size={80} className="text-blue-600 mx-auto mb-8 animate-bounce" />
        <h2 className="text-2xl font-black text-slate-900 uppercase mb-4 tracking-tighter italic">Voice Logged</h2>
        <p className="text-sm font-bold leading-relaxed mb-10 text-slate-400">Your recording is in the lab. Keep this page open or check back later to see your final score from the teacher.</p>
        <button onClick={() => window.location.reload()} className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black uppercase tracking-widest text-[10px]">Back to Home</button>
      </div>
    </div>
  )

  // --- UI: ACTIVE RECORDER ---
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="bg-white p-10 rounded-[60px] shadow-xl w-full max-w-2xl text-center border border-slate-100 relative overflow-hidden">
        <div className="flex justify-between items-center mb-10 text-[10px] font-black uppercase text-blue-600 tracking-widest">
          <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full">
            <User size={12}/> {student.full_name}
          </div>
          <div className="bg-slate-100 px-3 py-1.5 rounded-full text-slate-400">
            {student.class_name}
          </div>
        </div>

        {assignment ? (
          <div className="space-y-8">
            <div className="bg-blue-600 text-white p-10 rounded-[45px] font-bold text-2xl leading-snug shadow-2xl shadow-blue-100 relative">
               {assignment.image_prompt_url && (
                 <div className="mb-6 rounded-3xl overflow-hidden border-4 border-white shadow-lg bg-white">
                    <img src={assignment.image_prompt_url} alt="Task Visual" className="w-full max-h-80 object-cover" />
                 </div>
               )}
               <p className="relative z-10 italic">"{assignment.prompt_text}"</p>
               <span className="absolute top-4 right-6 text-[10px] font-black uppercase opacity-50 tracking-[0.2em]">{assignment.rubric_focus}</span>
            </div>

            {isUploading ? (
              <div className="flex flex-col items-center gap-4 py-10">
                <Loader2 className="animate-spin text-blue-600" size={60} />
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Syncing Audio to Lab...</p>
              </div>
            ) : !previewUrl ? (
              <div className="py-10">
                <button 
                  onClick={isRecording ? () => mediaRecorderRef.current.stop() : startRecording} 
                  className={`w-28 h-28 rounded-full flex items-center justify-center mx-auto transition-all shadow-2xl ${isRecording ? 'bg-slate-900 animate-pulse' : 'bg-red-500 hover:scale-110 active:scale-95 shadow-red-100'}`}
                >
                  {isRecording ? <Square size={36} className="text-white"/> : <Mic size={48} className="text-white"/>}
                </button>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-8">
                  {isRecording ? "Recording... Tap to Finish" : "Tap to Begin Speaking"}
                </p>
              </div>
            ) : (
              <div className="space-y-6 py-8 border-t border-slate-50 bg-slate-50/50 rounded-[40px] p-6">
                <div className="flex items-center justify-center gap-2 text-blue-600 mb-2">
                  <Volume2 size={16}/>
                  <span className="text-[10px] font-black uppercase tracking-widest">Review Your Attempt</span>
                </div>
                <audio 
                  controls 
                  src={previewUrl} 
                  onPlay={() => setHasReviewed(true)} 
                  className="w-full mb-6 accent-blue-600" 
                />
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => {setPreviewUrl(null); setAudioBlob(null)}} className="p-5 bg-white border border-slate-200 rounded-3xl font-black text-[11px] uppercase flex items-center justify-center gap-2 hover:bg-slate-50 transition-all text-slate-600">
                    <RotateCcw size={16}/> Rerecord
                  </button>
                  <button 
                    onClick={uploadSubmission} 
                    className={`p-5 rounded-3xl font-black text-[11px] uppercase flex items-center justify-center gap-2 transition-all shadow-lg ${hasReviewed ? 'bg-blue-600 text-white shadow-blue-100 hover:bg-slate-900' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                  >
                    <Send size={16}/> {hasReviewed ? 'Submit to Teacher' : 'Listen First'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-24 text-slate-300 font-black italic space-y-4">
            <LayoutList size={40} className="mx-auto opacity-20" />
            <p>Waiting for the teacher to push an active task...</p>
          </div>
        )}
      </div>
    </div>
  )
}
