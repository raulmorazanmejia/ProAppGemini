'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Mic, Square, CheckCircle, Loader2 } from 'lucide-react'

const supabaseUrl = 'https://twtlrehxjmduihfgmvul.supabase.co'
const supabaseAnonKey = 'sb_publishable_z_0bdiRubPVFWXscS6P6jw_Nipjt_...' // <--- PASTE YOUR FULL PUBLIC KEY HERE
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function StudentPage() {
  const [assignment, setAssignment] = useState(null)
  const [studentName, setStudentName] = useState('')
  const [status, setStatus] = useState('loading')
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])

  useEffect(() => {
    async function getTask() {
      const { data } = await supabase.from('assignments').select('*').limit(1).maybeSingle()
      if (data) setAssignment(data)
      setStatus('idle')
    }
    getTask()
  }, [])

  const startRecording = async () => {
    if (!studentName) return alert("Enter your name!")
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder.current = new MediaRecorder(stream)
    audioChunks.current = []
    mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data)
    mediaRecorder.current.onstop = async () => {
      setStatus('uploading')
      const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' })
      const fileName = `${Date.now()}-${studentName}.webm`
      await supabase.storage.from('recordings').upload(fileName, audioBlob)
      await supabase.from('submissions').insert([{ assignment_id: assignment.id, student_name: studentName, audio_path: fileName }])
      setStatus('success')
    }
    mediaRecorder.current.start()
    setStatus('recording')
  }

  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  if (status === 'success') return <div className="min-h-screen flex items-center justify-center"><h1>Sent! Well done.</h1></div>

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
        <input type="text" placeholder="Your Name" className="w-full p-4 border rounded-2xl mb-6 text-center" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
        <h1 className="text-2xl font-bold mb-2">{assignment?.title || "Speaking Task"}</h1>
        <p className="bg-slate-50 p-6 rounded-2xl italic mb-8 border">"{assignment?.prompt_text || "Waiting for prompt..."}"</p>
        <button onClick={status === 'recording' ? () => mediaRecorder.current.stop() : startRecording} className={`w-24 h-24 rounded-full flex items-center justify-center text-white shadow-lg ${status === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-blue-600'}`}>
          {status === 'recording' ? <Square size={32} /> : <Mic size={32} />}
        </button>
      </div>
    </div>
  )
}
