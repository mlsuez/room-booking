import { useState } from 'react'
export default function BookingModal({ api, date, room, onClose, onSuccess }) {
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const submit = async () => { setLoading(true); setError(null); try { const res = await fetch(`${api}/api/bookings`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room_id: room.roomId, date, start_time: room.slot.start, end_time: room.slot.end, title: title || 'Reunión' }) }); if (res.status === 409) { setError('Ese horario ya fue reservado'); setLoading(false); return }; if (!res.ok) { setError('Error al guardar'); setLoading(false); return }; onSuccess() } catch { setError('Error de conexión'); setLoading(false) } }
  return (<div className="modal-overlay" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()}><h3>Nueva reserva</h3><div className="modal-info"><strong>{room.roomName}</strong> · {room.slot.start} – {room.slot.end}</div><div className="field"><label>Descripción</label><input type="text" placeholder="Ej: Reunión de equipo" value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} autoFocus /></div>{error && <div className="modal-error">{error}</div>}<div className="modal-actions"><button onClick={onClose} disabled={loading}>Cancelar</button><button className="btn-primary" onClick={submit} disabled={loading}>{loading ? 'Guardando...' : 'Reservar'}</button></div></div></div>)
}
