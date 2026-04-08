'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Mic, Square, CheckCircle, History, Lock, User, Loader2, Volume2, RefreshCw, Trash2, Send, Play } from 'lucide-react'

const supabase = createClient(
  'https://cfpjjkfqkapamaulgysh.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmcGpqa2Zxa2FwYW1hdWxneXNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMDI5ODEsImV4cCI6MjA5MDU3ODk4MX0.AGm7hdpOxUYOu6q9BWjWeFWB1oMcp4ap-Wc1F9o-CT0'
)

export default function StudentGatekeeper() {
  const [assignment, setAssignment] = useState(null)
  const [studentCode, setStudentCode] = useState('')
  const [profile, setProfile] = useState(null)
  const [mySubmissions, setMySubmissions] = useState([])
  const [status, setStatus] = useState('idle') // idle, recording, reviewing, uploading, success
  const [previewUrl, setPreviewUrl] = useState(null)
  const [recordedBlob, setRecordedBlob] = useState(null)
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
    const { data } = await supabase.from('flair_students').select('*').eq('student_code', cleanCode).maybeSingle()
    if (data) {
        setProfile(data)
        localStorage.setItem('esl_student_code', cleanCode)
        loadHistory(data.full_name)
    } else if (code) { alert("Invalid code."); }
  }

  async function loadHistory(name) {
    if (!name) return;
    const searchName = name.trim().toLowerCase(); 
    const { data } = await supabase.from('flair_submissions')
        .select('*') 
        .eq('student_name', searchName) 
        .order('created_at', { ascending: false })
    setMySubmissions(data || [])
  }

  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        mediaRecorder.current = new MediaRecorder(stream)
        audioChunks.current = []
        mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data)
        mediaRecorder.current.onstop = () => {
            const blob = new Blob(audioChunks.current, { type: 'audio/webm' })
            setRecordedBlob(blob)
            setPreviewUrl(URL.createObjectURL(blob))
            setStatus('reviewing')
        }
        mediaRecorder.current.start()
        setStatus('recording')
    } catch (err) { alert("Mic error. Please allow access.") }
  }

const submitRecording = async () => {
    if (!recordedBlob) return;
    setStatus('uploading');

    try {
      // 1. Prepare file name
      const fileName = `${Date.now()}-${profile?.full_name?.replace(/\s+/g, '') || 'student'}.webm`;
      
      // 2. Upload audio to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('Student-audio')
        .upload(fileName, recordedBlob);

      if (uploadError) throw uploadError;

      const publicUrl = `https://cfpjjkfqkapamaulgysh.supabase.co/storage/v1/object/public/Student-audio/${fileName}`;

      // 3. Save to database AND get the new ID back
      const { data: dbData, error: dbError } = await supabase
        .from('flair_submissions')
        .insert([{ 
          student_name: profile?.full_name?.trim().toLowerCase() || 'anonymous', 
          prompt_text: assignment?.prompt_text || "General Task",
          audio_url: publicUrl,
          audio_path: fileName,
          status: 'submitted'
        }])
        .select(); 

      if (dbError) throw dbError;
      const submissionId = dbData[0].id;

      // 4. TRIGGER THE BRAIN (The AI Analysis)
      setStatus('analyzing'); 
      
      const aiResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          audioUrl: publicUrl, 
          promptText: assignment?.prompt_text || "General Task"
        }),
      });

      const aiData = await aiResponse.json();

      // 5. Update the row with Gemini's feedback
      if (aiData.transcript) {
        const { error: updateError } = await supabase
          .from('flair_submissions')
          .update({
            transcript: aiData.transcript,
            ai_score: aiData.ai_score,
            ai_comment: aiData.ai_comment
          })
          .eq('id', submissionId);

        if (updateError) {
          console.error("Database Error:", updateError.message);
        }
      }

      setStatus('done');
      if (typeof fetchSubmissions === 'function') fetchSubmissions(); 
      
    } catch (err) {
      console.error(err);
      alert("Something went wrong: " + err.message);
      setStatus('idle');
    }
  }; 

  const discardRecording = () => {
    setPreviewUrl(null)
    setRecordedBlob(null)
    setStatus('idle')
  }

  if (!profile) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-sm text-center">
        <Lock className="mx-auto mb-4 text-blue-600" size={40} />
        <h1 className="text-2xl font-bold mb-6">Class Login</h1>
        <input type="text" placeholder="Your Code" className="w-full p-4 border rounded-2xl mb-4 text-center font-bold" 
               onChange={(e) => setStudentCode(e.target.value)} />
        <button onClick={() => verifyCode(studentCode)} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold">Enter</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 text-slate-900 font-sans">
      <div className="max-w-2xl mx-auto space-y-8">
        
        <div className="bg-white rounded-3xl shadow-xl p-10 text-center border relative overflow-hidden transition-all">
          <div className="absolute top-4 right-4 text-[10px] font-bold text-slate-300 uppercase flex items-center gap-1">
            <User size={12} /> {profile.full_name}
          </div>

          {status === 'idle' && (
            <>
              <h1 className="text-xl font-black mb-4 uppercase tracking-tight text-slate-400">Current Task</h1>
              <p className="text-2xl font-bold text-slate-800 mb-10 italic">"{assignment?.prompt_text || "Waiting for task..."}"</p>
              <button onClick={startRecording} className="w-24 h-24 rounded-full mx-auto flex items-center justify-center text-white shadow-xl bg-blue-600 hover:scale-105 transition-all">
                <Mic size={40} />
              </button>
              <p className="mt-4 text-slate-400 font-bold text-xs uppercase tracking-widest">Tap to start recording</p>
            </>
          )}

          {status === 'recording' && (
            <>
              <div className="w-20 h-20 bg-red-100 rounded-full mx-auto mb-6 flex items-center justify-center animate-pulse">
                <div className="w-4 h-4 bg-red-600 rounded-full"></div>
              </div>
              <h2 className="text-2xl font-black text-red-600 animate-pulse mb-8">RECORDING...</h2>
              <button onClick={() => mediaRecorder.current.stop()} className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-white shadow-xl bg-red-600 scale-110">
                <Square size={30} fill="white" />
              </button>
            </>
          )}

          {status === 'reviewing' && (
            <div className="animate-in fade-in zoom-in duration-300">
              <h2 className="text-xl font-black text-slate-400 uppercase mb-6">Review Your Recording</h2>
              <div className="bg-slate-50 p-6 rounded-2xl border mb-8 flex flex-col items-center gap-4">
                <Play size={24} className="text-blue-500" />
                <audio src={previewUrl} controls className="w-full" />
              </div>
              <div className="flex gap-4">
                <button onClick={discardRecording} className="flex-1 bg-slate-100 text-slate-600 p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200">
                  <Trash2 size={18} /> Delete
                </button>
                <button onClick={submitRecording} className="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg">
                  <Send size={18} /> Submit
                </button>
              </div>
            </div>
          )}

          {status === 'uploading' && (
            <div className="py-10 flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-blue-600" size={50} />
                <p className="font-bold text-slate-400 uppercase tracking-widest">Sending to Professor...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-10">
                <CheckCircle className="text-green-500 mx-auto mb-4" size={60} />
                <h2 className="text-2xl font-black text-green-600">AUDIO SAVED!</h2>
                <p className="text-slate-400 font-bold mt-2">Refreshing history...</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2"><History size={14}/> My History</h2>
                <button onClick={() => loadHistory(profile.full_name)} className="text-blue-500 hover:rotate-180 transition-all duration-500">
                    <RefreshCw size={14} />
                </button>
            </div>
            <div className="space-y-4">
                {mySubmissions.map(s => (
                    <div key={s.id} className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col gap-5 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-bold text-slate-700 italic">"{s.prompt_text}"</p>
                          <span className="text-[10px] font-bold text-slate-300 uppercase">{new Date(s.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                            <div className="flex flex-col gap-2">
                                <span className="text-[10px] font-black uppercase text-slate-400">My Voice</span>
                                <audio src={s.audio_url} controls className="w-full h-8" />
                            </div>
                            {s.feedback_url && (
                                <div className="bg-green-600 p-4 rounded-2xl flex flex-col gap-2 shadow-lg">
                                    <span className="text-[10px] font-black uppercase text-white flex items-center gap-1"><Volume2 size={12}/> Teacher Feedback</span>
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
