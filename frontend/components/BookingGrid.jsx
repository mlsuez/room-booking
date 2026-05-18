import { useState, useEffect, useCallback } from 'react'
import BookingModal from './BookingModal'
const ROOMS = [{ id: 'sala-reuniones', name: 'Sala de Reuniones' }, { id: 'sala-multiuso', name: 'Sala Multiuso' }]
const SLOTS = []
for (let h = 9; h < 19; h++) { if (h === 13 || h === 14) { SLOTS.push({ start: `${h}:00`, end: `${h}:30`, label: `${String(h).padStart(2,'0')}:00` }); SLOTS.push({ start: `${h}:30`, end: `${h+1}:00`, label: `${String(h).padStart(2,'0')}:30` }) } else { SLOTS.push({ start: `${h}:00`, end: `${h+1}:00`, label: `${String(h).padStart(2,'0')}:00` }) } }
function isBlocked(roomId, startTime) { if (roomId !== 'sala-multiuso') return false; const [h, m] = startTime.split(':').map(Number); return h*60+m >= 780 && h*60+m < 870 }
function formatDate(d) { const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']; const months=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']; return `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}` }
function toDateString(d) { return d.toISOString().split('T')[0] }
export default function BookingGrid({ api, user }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [bookings, setBookings] = useState([])
  const [modal, setModal] = useState(null)
  const [error, setError] = useState(null)
  const fetchBookings = useCallback(async () => { setError(null); try { const res = await fetch(`${api}/api/bookings?date=${toDateString(currentDate)}`, { credentials: 'include' }); const data = await res.json(); setBookings(Array.isArray(data) ? data : []) } catch { setError('No se pudieron cargar las reservas') } }, [api, currentDate])
  useEffect(() => { fetchBookings() }, [fetchBookings])
  const changeDay = (n) => { const d = new Date(currentDate); d.setDate(d.getDate()+n); setCurrentDate(d) }
  const getBooking = (roomId, slot) => bookings.find(b => b.room_id === roomId && b.start_time.startsWith(slot.start))
  const handleCancel = async (id) => { if (!confirm('¿Cancelar esta reserva?')) return; try { await fetch(`${api}/api/bookings/${id}`, { method: 'DELETE', credentials: 'include' }); fetchBookings() } catch { alert('Error al cancelar') } }
  return (<div className="booking-grid"><div className="date-nav"><button onClick={() => changeDay(-1)}>‹</button><h2>{formatDate(currentDate)}</h2><button onClick={() => changeDay(1)}>›</button><button className="today-btn" onClick={() => setCurrentDate(new Date())}>Hoy</button></div>{error && <div className="error-banner">{error}</div>}<div className="rooms">{ROOMS.map(room => (<div key={room.id} className="room-col"><div className="room-header">{room.name}</div><div className="slots">{SLOTS.map(slot => { const blocked = isBlocked(room.id, slot.start); const booking = getBooking(room.id, slot); if (blocked) return (<div key={slot.start} className="slot slot-blocked"><span className="slot-time">{slot.label}</span><span className="slot-blocked-label">Multiuso</span></div>); if (booking) return (<div key={slot.start} className="slot slot-booked"><span className="slot-time">{slot.label}</span><div className="slot-booking-info"><strong>{booking.title}</strong><span>{booking.user_name}</span></div>{booking.user_email === user.email && <button className="btn-cancel" onClick={() => handleCancel(booking.id)}>✕</button>}</div>); return (<div key={slot.start} className="slot slot-free" onClick={() => setModal({ roomId: room.id, roomName: room.name, slot })}><span className="slot-time">{slot.label}</span><span className="slot-available">Disponible</span><button className="btn-book">+ Reservar</button></div>) })}</div></div>))}</div>{modal && <BookingModal api={api} date={toDateString(currentDate)} room={modal} onClose={() => setModal(null)} onSuccess={() => { setModal(null); fetchBookings() }} />}</div>)
}
