import { useEffect, useState, useRef } from 'react'
import { FiMoon, FiSun, FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi'
import { motion } from 'framer-motion'

const STORAGE_KEY = 'minimal:bookmarks:v1'

function ensureProtocol(u){
  if(!u) return ''
  if(/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(u)) return u
  return 'https://' + u
}

function makeId(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2,8)
}

function faviconFor(url){
  try{
    const u = new URL(url)
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=128`
  }catch{
    return ''
  }
}

function getHostname(url){
  try{ return new URL(url).hostname.replace(/^www\./,'') }catch{ return url }
}

export default function App(){
  const [dark, setDark] = useState(() => {
    try{
      return localStorage.getItem('minimal:theme') === 'dark'
    }catch{
      return false
    }
  })
  const [links, setLinks] = useState(() => {
    try{
      const raw = localStorage.getItem(STORAGE_KEY)
      if(raw){
        return JSON.parse(raw)
      }
    }catch{
      // fallthrough to seed
    }
    const seed = [
      { id: makeId(), url: 'https://github.com', icon: faviconFor('https://github.com') },
      { id: makeId(), url: 'https://news.ycombinator.com', icon: faviconFor('https://news.ycombinator.com') },
      { id: makeId(), url: 'https://google.com', icon: faviconFor('https://google.com') }
    ]
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(seed)) }catch(err){ console.warn('Failed to save seed data', err) }
    return seed
  })
  const [showInput, setShowInput] = useState(false)
  const [url, setUrl] = useState('')
  const [editingId, setEditingId] = useState(null)
  const modalRef = useRef(null)
  const [centerTitle, setCenterTitle] = useState('')

  useEffect(()=>{
    document.documentElement.classList.toggle('dark', dark)
    try{ localStorage.setItem('minimal:theme', dark ? 'dark' : 'light') }catch(err){ console.warn('save theme failed', err) }
  }, [dark])

  function persist(next){
    setLinks(next)
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) }catch(err){ console.warn('persist failed', err) }
  }

  function addLink(){
    if(!url) return
    const final = ensureProtocol(url.trim())
  try{ new URL(final) }catch{ alert('Invalid URL'); return }

    if(editingId){
      const updated = links.map(l => l.id === editingId ? { ...l, url: final, icon: faviconFor(final) } : l)
      persist(updated)
      setEditingId(null)
    }else{
      const item = { id: makeId(), url: final, icon: faviconFor(final) }
      const next = [item, ...links]
      persist(next)
    }

    setUrl('')
    setShowInput(false)
  }

  function beginEdit(item){
    setEditingId(item.id)
    setUrl(item.url)
    setShowInput(true)
  }

  function deleteLink(id){
    const next = links.filter(l=> l.id !== id)
    persist(next)
  }

  // Close modal when clicking/touching outside it or when pressing Escape
  useEffect(()=>{
    if(!showInput) return undefined
    function onPointerDown(e){
      const el = modalRef.current
      if(!el) return
      if(!el.contains(e.target)){
        setShowInput(false)
        setEditingId(null)
        setUrl('')
      }
    }
    function onKeyDown(e){
      if(e.key === 'Escape'){
        setShowInput(false)
        setEditingId(null)
        setUrl('')
      }
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return ()=>{
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [showInput])

  return (
    <div style={{ backgroundColor: dark ? '#0b0b0c' : '#ffffff', color: dark ? '#f7f7f8' : '#111111', minHeight: '100vh' }}>
      <button
        onClick={() => setDark(!dark)}
        className="absolute top-5 right-5 text-2xl"
        aria-label="Toggle theme"
        style={{ background: 'transparent', border: 'none', color: dark ? '#f7f7f8' : '#111111' }}
      >
        {dark ? <FiSun /> : <FiMoon />}
      </button>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h1 style={{ fontSize: 18, marginBottom: 6, color: dark ? '#eee' : '#222' }}>{centerTitle || 'Bookmarks'}</h1>

        <div className="max-w-4xl w-full flex flex-wrap justify-center gap-10 p-10">
          {links.map((item) => (
            <motion.div
              whileHover={{ scale: 1.06 }}
              key={item.id}
              className="relative group"
              onMouseEnter={() => setCenterTitle(getHostname(item.url))}
              onMouseLeave={() => setCenterTitle('')}
              onTouchStart={() => setCenterTitle(getHostname(item.url))}
            >
              <a href={item.url} target="_blank" rel="noreferrer">
                <img
                  src={item.icon}
                  alt={item.url}
                  className="w-20 h-20 rounded-3xl shadow-lg"
                  style={{ background: dark ? '#111' : '#ffffff' }}
                  onError={(e)=>{ e.currentTarget.src = faviconFor(item.url) }}
                />
              </a>

              <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: dark ? '#ddd' : '#333' }}>{getHostname(item.url)}</div>

              <div className="absolute -top-3 -right-3 hidden group-hover:flex gap-2">
                <button
                  onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); beginEdit(item) }}
                  className="bg-gray-700 p-1 rounded-full text-white"
                  aria-label="Edit"
                >
                  <FiEdit2 size={14} />
                </button>

                <button
                  onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); deleteLink(item.id) }}
                  className="bg-red-600 p-1 rounded-full text-white"
                  aria-label="Delete"
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <button
        onClick={() => { setShowInput(!showInput); if(showInput){ setEditingId(null); setUrl('') } }}
        className="fixed bottom-8 right-8 p-5 rounded-full text-2xl shadow-xl"
        aria-label="Add bookmark"
        style={{ background: dark ? '#111' : '#ffffff', color: dark ? '#fff' : '#000' }}
      >
        <FiPlus />
      </button>

      {showInput && (
        <div className="fixed inset-0" style={{ background: dark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div ref={modalRef} style={{ background: dark ? '#111' : '#fff', color: dark ? '#fff' : '#000', padding: 24, borderRadius: 24, width: 320 }}>
            <input
              type="text"
              placeholder="Paste Link"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="border p-3 rounded-xl outline-none"
              style={{ background: dark ? '#0b0b0c' : '#fff', color: dark ? '#fff' : '#000', borderColor: dark ? '#333' : '#ddd' }}
            />

            <div className="flex gap-2">
              <button
                onClick={addLink}
                className="bg-black text-white p-3 rounded-xl flex-1"
              >
                {editingId ? 'Update' : 'Save'}
              </button>
              {editingId && (
                <button
                  onClick={() => { deleteLink(editingId); setShowInput(false); setEditingId(null); setUrl('') }}
                  className="bg-red-600 text-white p-3 rounded-xl"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}