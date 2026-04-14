'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Mic, Square, Award, CheckCircle, RotateCcw, Send, Volume2, LayoutList, Loader2 } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function StudentPage() {
  const [student, setStudent] = useState(null); const [assignment, setAssignment] = useState(null);
  const [loginName, setLoginName] = useState(''); const [loginCode, setLoginCode] = useState('');
  const [isRecording, setIsRecording] = useState(false); const [previewUrl, setPreviewUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null); const [submission, setSubmission] = useState(null);
  const mediaRef = useRef(null); const chunks = useRef([]);

  useEffect(() => {
    async function getActive() {
      const { data } = await supabase.from('assignments').select('*').eq('is_active', true).maybeSingle()
      setAssignment(data)
    }
    getActive()
  }, [])

  // PERSISTENCE & REAL-TIME REVEAL
  useEffect(() => {
    if (student && assignment) {
      const fetchSub = async () => {
        const { data } = await supabase.from('submissions').select('*').eq('student_id', student.id).eq('assignment_id', assignment.id).maybeSingle()
        setSubmission(data)
      }
      fetchSub()

      // Listen for the "PUSH" from the teacher
      const channel = supabase.channel(`sub-${student.id}`).on('postgres_changes', { 
        event: 'UPDATE', schema: 'public', table: 'submissions', filter: `student_id=eq.${student.id}` 
      }, (p) => {
          console.log("Update received:", p.new.status)
          setSubmission(p.new)
      }).subscribe()
      return () => supabase.removeChannel(channel)
    }
  }, [student, assignment])

  const submit = async () => {
    const name = `${student.id}-${Date.now()}.webm`
    await supabase.storage.from('student-audio').upload(name, audioBlob)
    const { data: { publicUrl } } = supabase.storage.from('student-audio').getPublicUrl(name)
    
    // Create submission
    const { data } = await supabase.from('submissions').insert([{ 
      student_id: student.id, assignment_id: assignment.id, audio_url: publicUrl, status: 'submitted' 
    }]).select().single()
    
    setSubmission(data)
    
    // Trigger AI
    fetch('/api/analyze', { method: 'POST', body: JSON.stringify({ 
      submissionId: data.id, audioUrl: publicUrl, promptText: assignment.prompt_text, imagePromptUrl: assignment.image_prompt_url 
    })})
  }

  if (!student) return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6">
      <div className="bg-white p-12 rounded-[50px] shadow-2xl w-full max-w-sm text-center">
        <h1 className="text-2xl font-black text-slate-900 mb-8 uppercase italic italic">Student Lab</h1>
        <input value={loginName} onChange={e => setLoginName(e.target.value)} placeholder="Full Name" className="w-full p-4 bg-slate-50 border-none rounded-2xl mb-3 font-bold" />
        <input value={loginCode} onChange={e => setLoginCode(e.target.value)} placeholder="Access Code" className="w-full p-4 bg-slate-50 border-none rounded-2xl mb-6 font-bold" />
        <button onClick={async () => {
          const { data } = await supabase.from('students').select('*').eq('full_name', loginName).eq('student_code', loginCode).maybeSingle()
          if (data) setStudent(data); else alert("Login failed.")
        }} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase shadow-lg shadow-blue-100">Enter Lab</button>
      </div>
    </div>
  )

  // THE REVEAL (Only shows when status is 'graded')
  if (submission?.status === 'graded') return (
    <div className="min-h-screen bg-[#22C55E] flex items-center justify-center p-6 text-center">
      <div className="bg-white p-10 rounded-[60px] shadow-2xl w-full max-w-lg text-slate-900">
        <Award size={60} className="text-green-500 mx-auto mb-4" />
        <div className="inline-block bg-slate-900 text-white px-8 py-2 rounded-2xl font-black text-3xl mb-8">SCORE: {submission.final_score}/5</div>
        <p className="text-xl font-bold mb-8 italic">"{submission.feedback || 'Great job in the lab!'}"</p>
        {submission.feedback_audio_url && (
           <div className="bg-slate-50 p-4 rounded-3xl mb-8">
              <p className="text-[10px] font-black uppercase text-blue-400 mb-2">Teacher Voice Note</p>
              <audio controls src={submission.feedback_audio_url} className="w-full" />
           </div>
        )}
        <button onClick={() => window.location.reload()} className="w-full bg-green-500 text-white p-5 rounded-3xl font-black uppercase">Finish session</button>
      </div>
    </div>
  )

  // THE WAITING ROOM
  if (submission) return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6 text-white text-center">
      <div className="bg-white p-12 rounded-[60px] text-slate-900 max-w-sm">
        <div className="relative w-20 h-20 mx-auto mb-8">
            <CheckCircle size={80} className="text-blue-600 animate-pulse" />
        </div>
        <h2 className="text-2xl font-black uppercase mb-4 tracking-tighter italic">Voice Logged</h2>
        <p className="text-sm font-bold text-slate-400 italic mb-10">Your recording is in the lab. Keep this page open; your grade will appear as soon as the teacher pushes it.</p>
        <div className="flex items-center justify-center gap-2 text-blue-600 font-black text-[10px] uppercase">
            <Loader2 className="animate-spin" size={12}/> Waiting for teacher push...
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="bg-white p-10 rounded-[60px] shadow-xl w-full max-w-2xl text-center border">
        {assignment && (
          <div className="space-y-8">
            <div className="bg-blue-600 text-white p-10 rounded-[45px] font-bold text-2xl shadow-xl italic">
               {assignment.image_prompt_url && <img src={assignment.image_prompt_url} className="w-full max-h-80 object-cover rounded-[35px] mb-8 border-4 border-white shadow-lg" />}
               "{assignment.prompt_text}"
            </div>
            {!previewUrl ? (
              <button onClick={isRecording ? () => mediaRef.current.stop() : () => {
                navigator.mediaDevices.getUserMedia({audio:true}).then(s => {
                    mediaRef.current = new MediaRecorder(s);
                    chunks.current = [];
                    mediaRef.current.ondataavailable = e => chunks.current.push(e.data);
                    mediaRef.current.onstop = () => {
                        const blob = new Blob(chunks.current, {type:'audio/webm'});
                        setAudioBlob(blob); setPreviewUrl(URL.createObjectURL(blob)); setIsRecording(false);
                    };
                    mediaRef.current.start(); setIsRecording(true);
                })
              }} className={`w-28 h-28 rounded-full flex items-center justify-center mx-auto transition-all ${isRecording ? 'bg-black animate-pulse shadow-xl' : 'bg-red-500 shadow-2xl hover:scale-105 shadow-red-100'}`}>
                {isRecording ? <Square size={36} className="text-white"/> : <Mic size={48} className="text-white"/>}
              </button>
            ) : (
              <div className="space-y-6">
                <audio controls src={previewUrl} className="w-full mb-6" />
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setPreviewUrl(null)} className="p-5 bg-slate-100 rounded-3xl font-black text-[10px] uppercase">Rerecord</button>
                  <button onClick={submit} className="p-5 bg-blue-600 text-white rounded-3xl font-black text-[10px] uppercase shadow-lg shadow-blue-100">Submit Recording</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}