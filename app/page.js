'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Mic, Square, CloudUpload, User, Play, RotateCcw, Send, Volume2, CheckCircle2 } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function StudentPage() {
  const [student, setStudent] = useState(null)
  const [assignment, setAssignment] = useState(null)
  const [submission, setSubmission] = useState(null)
  const [loginName, setLoginName] = useState('')
  const [loginCode, setLoginCode] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const [audioBlob, setAudioBlob] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [hasReviewed, setHasReviewed] = useState(false)

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  useEffect(() => {
    const getTask = async () => {
      const { data } = await supabase.from('assignments').select('*').eq('is_active', true).single()
      setAssignment(data)
    }
    getTask()
  }, [])

  useEffect(() => {
    if (student && assignment) {
      const checkSubmission = async () => {
        const { data } = await supabase.from('submissions')
          .select('*')
          .eq('student_id', student.id)
          .eq('assignment_id', assignment.id)
          .single()
        setSubmission(data)
      }
      checkSubmission()
      
      // Real-time listener for grading
      const channel = supabase.channel('submission_updates')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'submissions', filter: `student_id=eq.${student.id}` }, 
          (payload) => {
            if (payload.new.assignment_id === assignment.id) {
              setSubmission(payload.new)
            }
          }
        ).subscribe()
        
      return () => { supabase.removeChannel(channel) }
    }
  }, [student, assignment])

  const handleLogin = async () => {
    const { data } = await supabase.from('students').select('*').eq('full_name', loginName).eq('student_code', loginCode).single()
    if (data) setStudent(data)
    else alert("Login failed. Check your name and code!")
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/mpeg' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setHasReviewed(false); // Reset review status for new recording
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access denied or not available.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleRerecord = () => {
    setAudioUrl(null);
    setAudioBlob(null);
    setHasReviewed(false);
    audioChunksRef.current = [];
  };

  const handleSubmit = async () => {
    if (!audioBlob || !student || !assignment || !hasReviewed) return;
    setSubmitting(true);

    try {
      const fileName = `${student.id}_${assignment.id}_${Date.now()}.mp3`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audio-submissions')
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('audio-submissions')
        .getPublicUrl(fileName);

      // Call AI Brain first
      const aiResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl: publicUrl,
          promptText: assignment.prompt_text,
          rubric: assignment.rubric_focus
        })
      });
      
      const aiData = await aiResponse.json();

      const { data: subData, error: insertError } = await supabase.from('submissions').insert([{
        student_id: student.id,
        assignment_id: assignment.id,
        audio_url: publicUrl,
        transcript: aiData.transcript,
        ai_score: aiData.ai_score,
        ai_comment: aiData.ai_comment,
        feedback: aiData.ai_comment, // Save AI feedback to feedback column initially
        status: 'submitted'
      }]).select().single();

      if (insertError) throw insertError;

      setSubmission(subData);
      alert("Submission successful!");
      handleRerecord();
    } catch (err) {
      console.error("Submission error:", err);
      alert("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center">
      <div className="bg-white p-8 rounded-[40px] shadow-xl w-full max-w-lg text-center border border-slate-100">
        <div className="flex justify-between items-center mb-8">
           <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Lab Active</span>
           <span className="text-[10px] font-black uppercase text-blue-600 flex items-center gap-1"><User size={10}/> {student.full_name}</span>
        </div>
        
        {assignment ? (
          <>
            <div className="bg-slate-50 p-8 rounded-3xl mb-8 border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2">
                <span className="text-[8px] font-black uppercase px-2 py-1 bg-blue-100 text-blue-600 rounded-full">{assignment.rubric_focus}</span>
              </div>
              <p className="text-lg font-bold text-slate-700 leading-tight mb-4">{assignment.prompt_text}</p>
              
              {assignment.teacher_audio_url && (
                <div className="mt-4 p-4 bg-white rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-2 flex items-center justify-center gap-2"><Volume2 size={12}/> Teacher's Model</p>
                  <audio controls src={assignment.teacher_audio_url} className="w-full h-8" />
                </div>
              )}
            </div>

            {submission ? (
              <div className="space-y-6">
                <div className="p-6 bg-green-50 rounded-3xl border border-green-100 text-center">
                  <CheckCircle2 size={32} className="text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-black text-green-700 uppercase tracking-widest">Task Submitted</p>
                </div>

                {submission.status === 'graded' && (
                  <div className="bg-white p-6 rounded-3xl border-2 border-blue-100 shadow-lg text-left space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-black text-xs uppercase tracking-widest text-blue-600">Teacher Feedback</h3>
                      <span className="text-xl font-black text-blue-600">{submission.final_score}/5</span>
                    </div>
                    
                    <p className="text-sm text-slate-600 italic leading-relaxed">"{submission.feedback}"</p>
                    
                    {submission.feedback_audio_url && (
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                         <p className="text-[9px] font-black uppercase text-slate-400 mb-2 flex items-center gap-2"><Mic size={10}/> Voice Feedback</p>
                         <audio controls src={submission.feedback_audio_url} className="w-full h-8" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {!audioUrl ? (
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
                ) : (
                  <div className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <audio 
                        controls 
                        src={audioUrl} 
                        className="w-full h-10" 
                        onPlay={() => setHasReviewed(true)}
                      />
                    </div>
                    
                    <div className="flex gap-4 justify-center">
                      <button 
                        onClick={handleRerecord}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition"
                      >
                        <RotateCcw size={16} /> Rerecord
                      </button>
                      <button 
                        onClick={handleSubmit}
                        disabled={submitting || !hasReviewed}
                        className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition shadow-lg ${hasReviewed ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}
                      >
                        {submitting ? "Submitting..." : <><Send size={16} /> Submit</>}
                      </button>
                    </div>
                    {!hasReviewed && <p className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter">Listen to your recording before submitting</p>}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="p-10 text-slate-300 font-bold italic">Waiting for teacher...</p>
        )}
      </div>
    </div>
  )
}


