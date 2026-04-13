'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { CheckCircle, Users, LayoutGrid, Plus, LogOut } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function TeacherDashboard() {
  const [prompts, setPrompts] = useState([])
  const [roster, setRoster] = useState([])
  const [newTaskText, setNewTaskText] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: pList } = await supabase.from('assignments').select('*').order('created_at', { ascending: false })
    const { data: rList } = await supabase.from('students').select('*').order('full_name', { ascending: true })
    setPrompts(pList || [])
    setRoster(rList || [])
    setLoading(false)
  }

  const addTask = async () => {
    if (!newTaskText) return
    const { error } = await supabase.from('assignments').insert([
      { prompt_text: newTaskText, is_active: false, platform: 'gemini' }
    ])
    if (error) alert("Error adding task!")
    else {
      setNewTaskText('')
      loadData()
    }
  }

  // THE POWER SWITCH: Turns a task on and turns all others off
  const toggleActive = async (id, currentStatus) => {
    // 1. Turn everything off first (to ensure only one is active)
    await supabase.from('assignments').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000')
    
    // 2. Turn the selected one on
    const { error } = await supabase.from('assignments').update({ is_active: !currentStatus }).eq('id', id)
    
    if (error) alert("Could not activate task")
    else loadData()
  }

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-black">CONNECTING...</div>

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-8">
        <h1 className="text-2xl font-black tracking-tighter text-blue-600">GEMINI LAB DASHBOARD</h1>
        <button onClick={() => window.location.reload()} className="p-2 hover:bg-slate-200 rounded-full transition">
          <LogOut size={20} className="text-slate-400" />
        </button>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4">
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100">
            <h2 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
              <LayoutGrid size={14}/> Create New Task
            </h2>
            <div className="mb-6 p-4 bg-blue-50 rounded-2xl">
              <textarea 
                value={newTaskText} 
                onChange={(e) => setNewTaskText(e.target.value)} 
                className="w-full p-3 border rounded-xl text-xs mb-3 h-24 font-medium" 
              />
              <button onClick={addTask} className="w-full bg-blue-600 text-white p-3 rounded-xl font-black text-[10px] uppercase tracking-widest">
                Save Task
              </button>
            </div>
            
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase">Click checkmark to activate</h3>
              {prompts.map(p => (
                <div key={p.id} className="p-4 bg-white border rounded-2xl flex justify-between items-center shadow-sm">
                  <p className="text-xs font-bold text-slate-600">{p.prompt_text}</p>
                  <button onClick={() => toggleActive(p.id, p.is_active)}>
                    <CheckCircle size={20} className={p.is_active ? "text-green-500" : "text-slate-200 hover:text-blue-400"} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 min-h-[400px]">
             <h2 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-6">Connected Students</h2>
             <div className="grid grid-cols-2 gap-4">
               {roster.map(student => (
                 <div key={student.id} className="p-4 border rounded-2xl flex items-center gap-3">
                   <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-400 text-[10px]">
                     {student.full_name?.charAt(0)}
                   </div>
                   <p className="text-xs font-bold">{student.full_name}</p>
                 </div>
               ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}