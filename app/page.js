'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Mic, Square } from 'lucide-react'

console.log("!!! ATTENTION: THE NEW ENGINE IS RUNNING !!!") // <--- THE SHOUT

const supabase = createClient(
  'https://twtlrehxjmduihfgmvul.supabase.co', 
  'sb_publishable_z_0bdiRubPVFWXscS6P6jw_Nipjt_69656166316238322d366366342d346430342d613239632d393165306631613936663235'
)

export default function StudentPage() {
  const [assignment, setAssignment] = useState(null)
  const [studentName, setStudentName] = useState('')
  const [status, setStatus] = useState('idle')
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])

  useEffect(() => {
    async function getTask() {
      console.log("Fetching from:", 'https://twtlrehxjmduihfgmvul.supabase.co')
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

  if (status === 'success') return <div className="min-h-screen flex items-center justify-center"><h1>Sent! Well done.</h1></div>

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 text-center border">
        {/* I changed this placeholder text to prove it's the new version */}
        <input type="text" placeholder="ENTER STUDENT NAME HERE" className="w-full p-4 border rounded-2xl mb-8 text-center font-bold" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
        <h1 className="text-2xl font-black mb-2 uppercase">{assignment?.title || "Speaking Task"}</h1>
        <p className="bg-slate-50 p-6 rounded-2xl italic mb-10 border font-medium">"{assignment?.prompt_text || "Waiting for your teacher..."}"</p>
        <button onClick={status === 'recording' ? () => mediaRecorder.current.stop() : startRecording} className={`w-24 h-24 rounded-full flex items-center justify-center text-white shadow-xl ${status === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-blue-600'}`}>
          {status === 'recording' ? <Square size={36} /> : <Mic size={36} />}
        </button>
      </div>
    </div>
  )
}
