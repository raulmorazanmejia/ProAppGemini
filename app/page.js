'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Mic, Square, CheckCircle, Loader2, AlertCircle } from 'lucide-react'

export default function StudentPage() {
  const [assignment, setAssignment] = useState(null)
  const [studentName, setStudentName] = useState('')
  const [status, setStatus] = useState('loading')
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])

  useEffect(() => {
    async function getTask() {
      // We use .maybeSingle() so it doesn't crash if the table is empty
      const { data, error } = await supabase.from('assignments').select('*').limit(1).maybeSingle()
      if (error) console.error("Database Error:", error)
      if (data) setAssignment(data)
      setStatus('idle')
    }
    getTask()
  }, [])

  const startRecording = async () => {
    if (!studentName) return alert("Please enter your name first!")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorder.current = new MediaRecorder(stream)
      audioChunks.current = []
      mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data)
      mediaRecorder.current.onstop = uploadAudio
      mediaRecorder.current.start()
      setStatus('recording')
    } catch (err) {
      alert("Microphone blocked! Please allow access in your browser settings.")
    }
  }

  const stopRecording = () => {
    mediaRecorder.current.stop()
    setStatus('uploading')
  }

  const uploadAudio = async () => {
    const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' })
    const fileName = `${Date.now()}-${studentName.replace(/\s/g, '_')}.webm`

    const { error: storageError } = await supabase.storage.from('recordings').upload(fileName, audioBlob)
    if (storageError) return alert("Upload failed: " + storageError.message)

    await supabase.from('submissions').insert([{
      assignment_id: assignment.id,
      student_name: studentName,
      audio_path: fileName
    }])
    setStatus('success')
  }

  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center">Loading Classroom...</div>

  const color = assignment?.theme_config?.primaryColor || '#3b82f6'

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="bg-white p-10 rounded-3xl shadow-xl">
          <CheckCircle className="mx-auto mb-4 text-green-500" size={64} />
          <h2 className="text-2xl font-bold">Sent!</h2>
          <p className="text-gray-500">Good job, {studentName}.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ backgroundColor: `${color}05` }}>
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border">
        <div className="h-2 w-full" style={{ backgroundColor: color }}></div>
        <div className="p-8 text-center">
          {!assignment && (
            <div className="flex flex-col items-center text-amber-500 mb-6">
              <AlertCircle size={40} />
              <p className="text-sm font-bold mt-2">No active assignment found.</p>
            </div>
          )}
          <input 
            type="text" placeholder="Your Name"
            className="w-full p-3 border rounded-xl mb-6 text-center outline-none focus:ring-2"
            style={{ borderColor: color }}
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
          />
          <h1 className="text-xl font-bold mb-4">{assignment?.title || "Speaking Task"}</h1>
          <p className="bg-slate-50 p-4 rounded-xl italic mb-8 border border-slate-100 font-medium">
             "{assignment?.prompt_text || "Please wait for your teacher to set a prompt."}"
          </p>

          {assignment && status === 'idle' && (
            <button onClick={startRecording} className="w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg transition-all hover:scale-110 active:scale-95" style={{ backgroundColor: color }}>
              <Mic size={32} />
            </button>
          )}

          {status === 'recording' && (
            <button onClick={stopRecording} className="w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg animate-pulse" style={{ backgroundColor: '#ef4444' }}>
              <Square size={32} />
            </button>
          )}

          {status === 'uploading' && <Loader2 className="animate-spin mx-auto text-gray-400" size={48} />}
          
          <p className="mt-6 text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">
            {status === 'recording' ? 'Recording Now' : 'Tap to Start'}
          </p>
        </div>
      </div>
    </div>
  )
}
