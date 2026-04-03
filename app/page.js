'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Mic, Square, CheckCircle } from 'lucide-react'

const supabase = createClient('https://twtlrehxjmduihfgmvul.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dGxyZWh4am1kdWxoZmdtdnVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNzczMjMsImV4cCI6MjA5MDc1MzMyM30.lRmfe4N2PKX4Q0lJ-_fG9tUAb9Bh-r3Nr-G_diuu8OU')

export default function StudentPage() {
  const [assignment, setAssignment] = useState(null)
  const [studentName, setStudentName] = useState('')
  const [status, setStatus] = useState('idle')
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])

  useEffect(() => {
    async function getTask() {
      const { data } = await supabase.from('assignments').select('*').limit(1).maybeSingle()
      if (data) setAssignment(data)
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

  if (status === 'success') return <div className="min-h-screen flex items-center justify-center font-sans"><h1>Sent! Well done.</h1></div>

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border">
        <input type="text" placeholder="Your Name" className="w-full p-3 border rounded-xl mb-6 text-center" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
        <h1 className="text-xl font-bold mb-4">{assignment?.title || "Speaking Task"}</h1>
        <p className="bg-slate-50 p-4 rounded-xl mb-8 border">"{assignment?.prompt_text || "Waiting for teacher..."}"</p>
        <button onClick={status === 'recording' ? () => mediaRecorder.current.stop() : startRecording} className={`w-20 h-20 rounded-full flex items-center justify-center text-white ${status === 'recording' ? 'bg-red-500' : 'bg-blue-600'}`}>
          {status === 'recording' ? <Square size={32} /> : <Mic size={32} />}
        </button>
      </div>
    </div>
  )
}
