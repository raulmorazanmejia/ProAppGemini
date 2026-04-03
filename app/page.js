'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Mic, Square } from 'lucide-react'

const supabase = createClient(
  'https://cfpjjkfqkapamaulgysh.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmcGpqa2Zxa2FwYW1hdWxneXNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMDI5ODEsImV4cCI6MjA5MDU3ODk4MX0.AGm7hdpOxUYOu6q9BWjWeFWB1oMcp4ap-Wc1F9o-CT0'
)

export default function StudentPage() {
  const [assignment, setAssignment] = useState(null)
  const [studentName, setStudentName] = useState('')
  const [status, setStatus] = useState('idle')
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])

  useEffect(() => {
    async function getTask() {
      const { data } = await supabase.from('prompts').select('*').eq('is_active', true).limit(1).maybeSingle()
      if (data) setAssignment(data)
    }
    getTask()
  }, [])

  const startRecording = async () => {
    if (!studentName) return alert("Please enter your name first!")
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder.current = new MediaRecorder(stream)
    audioChunks.current = []
    mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data)
    mediaRecorder.current.onstop = async () => {
      setStatus('uploading')
      const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' })
      const fileName = `${Date.now()}-${studentName}.webm`
      
      // FIXED: Pointing to 'Student-audio' bucket
      const { data: uploadData } = await supabase.storage.from('Student-audio').upload(fileName, audioBlob)
      
      if (uploadData) {
        const publicUrl = `https://cfpjjkfqkapamaulgysh.supabase.co/storage/v1/object/public/Student-audio/${fileName}`
        
        await supabase.from('student_submissions').insert([{ 
          student_name: studentName, 
          prompt_text: assignment?.prompt_text || "General Task",
          audio_path: uploadData.path,
          audio_url: publicUrl // This keeps the "Ugly" app working too!
        }])
        setStatus('success')
      }
    }
    mediaRecorder.current.start()
    setStatus('recording')
  }

  if (status === 'success') return <div className="min-h-screen flex items-center justify-center font-sans"><h1 className="text-2xl font-bold">Sent! Thanks, {studentName}.</h1></div>

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 font-sans text-slate-900">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 text-center border">
        <input type="text" placeholder="Your Name" className="w-full p-4 border rounded-2xl mb-8 text-center font-bold bg-slate-50" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
        <h1 className="text-2xl font-black mb-2 uppercase tracking-tight">Speaking Task</h1>
        <p className="bg-slate-100 p-6 rounded-2xl italic mb-10 border font-medium text-slate-700">
            "{assignment?.prompt_text || "Waiting for teacher..."}"
        </p>
        <button onClick={status === 'recording' ? () => mediaRecorder.current.stop() : startRecording} className={`w-24 h-24 rounded-full flex items-center justify-center text-white shadow-xl transition-all ${status === 'recording' ? 'bg-red-500 animate-pulse scale-110' : 'bg-blue-600 hover:bg-blue-700'}`}>
          {status === 'recording' ? <Square size={36} /> : <Mic size={36} />}
        </button>
      </div>
    </div>
  )
}
