'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { CheckCircle, Users, LayoutGrid, Trash2, Mic, Play, Square, Save, RotateCcw, Send, Volume2, Clock, CheckCircle2 } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function TeacherDashboard() {
  const [prompts, setPrompts] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [roster, setRoster] = useState([])
  const [newTask, setNewTask] = useState('')
  const [rubricFocus, setRubricFocus] = useState('General')
  const [newName, setNewName] = useState('')
  const [newCode, setNewCode] = useState('')
  const [loading, setLoading] = useState(true)
  
  // Teacher Assignment Recording State
  const [isRecordingTask, setIsRecordingTask] = useState(false)
  const [taskAudioBlob, setTaskAudioBlob] = useState(null)
  const [taskAudioUrl, setTaskAudioUrl] = useState(null)
  const taskRecorderRef = useRef(null)
  const taskChunksRef = useRef([])

  // Feedback State
  const [feedbackData, setFeedbackData] = useState({})
  
  // Feedback Recording State (per submission)
  const [recordingFeedbackId, setRecordingFeedbackId] = useState(null)
  const [feedbackAudioBlobs, setFeedbackAudioBlobs] = useState({})
  const [feedbackAudioUrls, setFeedbackAudioUrls] = useState({})
  const feedbackRecorderRef = useRef(null)
  const feedbackChunksRef = useRef([])

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: p } = await supabase.from('assignments').select('*').order('created_at', { ascending: false })
    const { data: s } = await supabase.from('submissions').select('*, students(full_name), assignments(prompt_text)').order('created_at', { ascending: false })
    const { data: r } = await supabase.from('students').select('*').order('full_name', { ascending: true })
    
    setPrompts(p || [])
    setSubmissions(s || [])
    setRoster(r || [])
    
    // Initialize feedback state
    const initialFeedback = {}
    s?.forEach(sub => {
      initialFeedback[sub.id] = {
        final_score: sub.final_score || sub.ai_score || 3,
        feedback: sub.feedback || sub.ai_comment || ''
      }
    })
    setFeedbackData(initialFeedback)
    
    setLoading(false)
  }

  // --- Assignment Recording ---
  const startTaskRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      taskChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      taskRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => taskChunksRef.current.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(taskChunksRef.current, { type: 'audio/mpeg' });
        setTaskAudioBlob(blob);
        setTaskAudioUrl(URL.createObjectURL(blob));
      };
      mediaRecorder.start();
      setIsRecordingTask(true);
    } catch (err) { alert("Mic error") }
  };

  const stopTaskRecording = () => {
    if (taskRecorderRef.current) {
      taskRecorderRef.current.stop();
      setIsRecordingTask(false);
      taskRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
  };

  // --- Feedback Recording ---
  const startFeedbackRecording = async (subId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      feedbackChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      feedbackRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => feedbackChunksRef.current.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(feedbackChunksRef.current, { type: 'audio/mpeg' });
        setFeedbackAudioBlobs(prev => ({ ...prev, [subId]: blob }));
        setFeedbackAudioUrls(prev => ({ ...prev, [subId]: URL.createObjectURL(blob) }));
      };
      mediaRecorder.start();
      setRecordingFeedbackId(subId);
    } catch (err) { alert("Mic error") }
  };

  const stopFeedbackRecording = () => {
    if (feedbackRecorderRef.current) {
      feedbackRecorderRef.current.stop();
      setRecordingFeedbackId(null);
      feedbackRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
  };

  const addTask = async () => {
    if (!newTask && !taskAudioBlob) return
    
    let finalAudioUrl = null;
    if (taskAudioBlob) {
      const fileName = `prompt_${Date.now()}.mp3`;
      await supabase.storage.from('audio-prompts').upload(fileName, taskAudioBlob);
      const { data } = supabase.storage.from('audio-prompts').getPublicUrl(fileName);
      finalAudioUrl = data.publicUrl;
    }

    await supabase.from('assignments').insert([{ 
      prompt_text: newTask, 
      teacher_audio_url: finalAudioUrl,
      rubric_focus: rubricFocus,
      is_active: false, 
      platform: 'gemini' 
    }])
    
    setNewTask('');
    setTaskAudioBlob(null);
    setTaskAudioUrl(null);
    loadData()
  }

  const saveSubmissionFeedback = async (subId) => {
    const { final_score, feedback } = feedbackData[subId]
    const audioBlob = feedbackAudioBlobs[subId]
    
    let feedbackAudioUrl = submissions.find(s => s.id === subId)?.feedback_audio_url;
    
    if (audioBlob) {
      const fileName = `feedback_${subId}_${Date.now()}.mp3`;
      await supabase.storage.from('audio-feedback').upload(fileName, audioBlob);
      const { data } = supabase.storage.from('audio-feedback').getPublicUrl(fileName);
      feedbackAudioUrl = data.publicUrl;
    }

    await supabase.from('submissions').update({ 
      final_score, 
      feedback,
      feedback_audio_url: feedbackAudioUrl,
      status: 'graded'
    }).eq('id', subId)
    
    alert("Feedback pushed to student!")
    loadData()
  }

  const addStudent = async () => {
    if (!newName || !newCode) return
    await supabase.from('students').insert([{ full_name: newName, student_code: newCode }])
    setNewName(''); setNewCode(''); loadData()
  }

  const deleteStudent = async (id) => {
    await supabase.from('students').delete().eq('id', id)
    loadData()
  }

  const toggleActive = async (id, status) => {
    await supabase.from('assignments').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('assignments').update({ is_active: !status }).eq('id', id)
    loadData()
  }

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-black tracking-widest">RESTORING LAB...</div>

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUMN 1: ROSTER */}
        <div className="lg:col-span-3">
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100">
            <h2 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2"><Users size={14}/> Class Roster</h2>
            <div className="space-y-2 mb-6">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name" className="w-full p-2 border rounded-xl text-xs" />
              <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="Code" className="w-full p-2 border rounded-xl text-xs" />
              <button onClick={addStudent} className="w-full bg-blue-600 text-white p-2 rounded-xl font-bold text-xs uppercase tracking-widest">Add Student</button>
            </div>
            <div className="space-y-2">
              {roster.map(s => (
                <div key={s.id} className="p-3 border rounded-xl flex justify-between items-center group">
                  <p className="text-[10px] font-bold">{s.full_name} <span className="text-slate-300">({s.student_code})</span></p>
                  <button onClick={() => deleteStudent(s.id)} className="text-slate-200 hover:text-red-500"><Trash2 size={14}/></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COLUMN 2: TASKS */}
        <div className="lg:col-span-4">
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100">
            <h2 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2"><LayoutGrid size={14}/> New Assignment</h2>
            
            <div className="mb-4">
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Rubric Focus</label>
              <select 
                value={rubricFocus} 
                onChange={(e) => setRubricFocus(e.target.value)}
                className="w-full p-2 border rounded-xl text-xs font-bold bg-slate-50"
              >
                <option>General</option>
                <option>Pronunciation</option>
                <option>Grammar</option>
                <option>Vocabulary</option>
              </select>
            </div>

            <textarea value={newTask} onChange={e => setNewTask(e.target.value)} className="w-full p-3 border rounded-xl text-xs mb-3 h-20" placeholder="Text prompt..." />
            
            <div className="mb-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Voice Prompt</p>
              {!taskAudioUrl ? (
                <button 
                  onClick={isRecordingTask ? stopTaskRecording : startTaskRecording}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${isRecordingTask ? 'bg-slate-900 text-white animate-pulse' : 'bg-white border text-slate-600'}`}
                >
                  {isRecordingTask ? <><Square size={12}/> Stop</> : <><Mic size={12}/> Record Voice</>}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <audio src={taskAudioUrl} controls className="h-8 flex-1" />
                  <button onClick={() => {setTaskAudioUrl(null); setTaskAudioBlob(null)}} className="p-2 text-slate-400 hover:text-red-500"><RotateCcw size={14}/></button>
                </div>
              )}
            </div>

            <button onClick={addTask} className="w-full bg-blue-600 text-white p-3 rounded-xl font-black text-[10px] uppercase tracking-widest mb-6">Create Assignment</button>
            
            <div className="space-y-3">
              {prompts.map(p => (
                <div key={p.id} className="p-4 border rounded-2xl flex justify-between items-center bg-white">
                  <div className="max-w-[80%]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-slate-100 rounded-full text-slate-500">{p.rubric_focus}</span>
                    </div>
                    <p className="text-xs font-bold leading-tight">{p.prompt_text || "Voice Prompt Only"}</p>
                    {p.teacher_audio_url && <audio src={p.teacher_audio_url} controls className="h-6 mt-2 w-full" />}
                  </div>
                  <button onClick={() => toggleActive(p.id, p.is_active)}><CheckCircle size={20} className={p.is_active ? "text-green-500" : "text-slate-200"} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COLUMN 3: SUBMISSIONS */}
        <div className="lg:col-span-5">
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 min-h-[500px]">
            <h2 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-6">Student Submissions</h2>
            <div className="space-y-6">
              {submissions.map(sub => (
                <div key={sub.id} className="p-6 border rounded-[32px] bg-white shadow-sm relative border-slate-100">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center"><Users size={16} className="text-slate-400"/></div>
                      <div>
                        <p className="text-xs font-black uppercase">{sub.students?.full_name}</p>
                        <p className="text-[10px] text-slate-400 italic">"{sub.assignments?.prompt_text}"</p>
                      </div>
                    </div>
                    {sub.status === 'graded' ? (
                      <span className="flex items-center gap-1 text-[8px] font-black uppercase bg-green-100 text-green-600 px-2 py-1 rounded-full"><CheckCircle2 size={10}/> Graded</span>
                    ) : (
                      <span className="flex items-center gap-1 text-[8px] font-black uppercase bg-amber-100 text-amber-600 px-2 py-1 rounded-full"><Clock size={10}/> Pending</span>
                    )}
                  </div>
                  
                  <audio controls src={sub.audio_url} className="w-full mb-6 h-10" />
                  
                  <div className="space-y-4 pt-4 border-t border-slate-50">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] font-black uppercase text-slate-400">Final Score</label>
                        <span className="text-xs font-black text-blue-600">{feedbackData[sub.id]?.final_score}/5</span>
                      </div>
                      <input 
                        type="range" min="1" max="5" 
                        value={feedbackData[sub.id]?.final_score || 3}
                        onChange={(e) => setFeedbackData({...feedbackData, [sub.id]: {...feedbackData[sub.id], final_score: parseInt(e.target.value)}})}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Feedback (Editable)</label>
                      <textarea 
                        value={feedbackData[sub.id]?.feedback || ''}
                        onChange={(e) => setFeedbackData({...feedbackData, [sub.id]: {...feedbackData[sub.id], feedback: e.target.value}})}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs h-24 focus:ring-2 focus:ring-blue-100 outline-none transition"
                        placeholder="Enter feedback..."
                      />
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-3 flex items-center gap-2"><Volume2 size={12}/> Voice Feedback</p>
                      {!feedbackAudioUrls[sub.id] ? (
                        <button 
                          onClick={recordingFeedbackId === sub.id ? stopFeedbackRecording : () => startFeedbackRecording(sub.id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${recordingFeedbackId === sub.id ? 'bg-slate-900 text-white animate-pulse' : 'bg-white border text-slate-600'}`}
                        >
                          {recordingFeedbackId === sub.id ? <><Square size={12}/> Stop</> : <><Mic size={12}/> Record Feedback</>}
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <audio src={feedbackAudioUrls[sub.id]} controls className="h-8 flex-1" />
                          <button onClick={() => {
                            setFeedbackAudioUrls(prev => { const n = {...prev}; delete n[sub.id]; return n; });
                            setFeedbackAudioBlobs(prev => { const n = {...prev}; delete n[sub.id]; return n; });
                          }} className="p-2 text-slate-400 hover:text-red-500"><RotateCcw size={14}/></button>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => saveSubmissionFeedback(sub.id)}
                      className="w-full bg-blue-600 text-white p-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-100"
                    >
                      <Send size={14}/> Push to Student
                    </button>
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


