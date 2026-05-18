import { useState, useEffect } from 'react'
import Login from './components/Login'
import BookingGrid from './components/BookingGrid'
import './App.css'
const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { fetch(`${API}/auth/me`, { credentials: 'include' }).then(r => r.ok ? r.json() : null).then(data => { setUser(data); setLoading(false) }).catch(() => setLoading(false)) }, [])
  const logout = () => { fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' }).then(() => setUser(null)) }
  if (loading) return <div className="loading">Cargando...</div>
  if (!user) return <Login api={API} />
  return (<div className="app"><header className="app-header"><h1>🏢 Reserva de Salas</h1><div className="user-info"><span>{user.name}</span><span className="provider-badge">{user.provider === 'google' ? '📧 Gmail' : '📨 Outlook'}</span><button onClick={logout}>Salir</button></div></header><BookingGrid api={API} user={user} /></div>)
}
