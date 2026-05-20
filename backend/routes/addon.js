import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
const router = Router();

const TASKPANE_TEMPLATE = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reserva de Salas</title>
  <script src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #1c1c1a; background: #f5f5f4; padding: 12px; }
    h2 { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
    .room { background: white; border-radius: 8px; border: 1px solid #e8e8e6; padding: 12px; margin-bottom: 8px; }
    .room h3 { font-size: 14px; font-weight: 500; margin-bottom: 6px; }
    .available { color: #166534; font-size: 13px; }
    .occupied { color: #b91c1c; font-size: 13px; }
    button { margin-top: 8px; width: 100%; padding: 8px; border-radius: 6px; border: none; background: #1c1c1a; color: white; font-size: 13px; cursor: pointer; }
    button:disabled { background: #ccc; cursor: default; }
    .info { font-size: 12px; color: #888; margin-bottom: 12px; }
    .msg { padding: 8px 12px; border-radius: 6px; font-size: 13px; margin-bottom: 8px; }
    .msg.success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
    .msg.error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    #loading { color: #888; font-size: 13px; }
  </style>
</head>
<body>
  <h2>Reserva de Salas</h2>
  <div id="info" class="info"></div>
  <div id="msg"></div>
  <div id="content"><div id="loading">Cargando...</div></div>
  <script>
    const API_URL = 'https://room-booking-production-18f7.up.railway.app';
    const API_KEY = '%%ADDON_API_KEY%%';
    Office.onReady(() => {
      const item = Office.context.mailbox.item;
      item.start.getAsync(r1 => {
        item.end.getAsync(r2 => {
          const s = r1.value, e = r2.value;
          const date = s.toISOString().split('T')[0];
          const startTime = pad(s.getHours()) + ':' + pad(s.getMinutes());
          const endTime = pad(e.getHours()) + ':' + pad(e.getMinutes());
          document.getElementById('info').textContent = date + '  ' + startTime + ' – ' + endTime;
          loadRooms(date, startTime, endTime);
        });
      });
    });
    function pad(n) { return String(n).padStart(2, '0'); }
    async function loadRooms(date, startTime, endTime) {
      try {
        const res = await fetch(API_URL + '/api/addon/availability?date=' + date, { headers: { 'x-addon-key': API_KEY } });
        renderRooms(await res.json(), date, startTime, endTime);
      } catch { document.getElementById('content').innerHTML = '<p style="color:#b91c1c">Error al cargar disponibilidad.</p>'; }
    }
    function checkAvailable(room, startTime, endTime) {
      for (const b of room.blocked) { if (startTime < b.end && endTime > b.start) return { available: false, reason: b.reason }; }
      for (const b of room.bookings) { if (startTime < b.end_time.substring(0,5) && endTime > b.start_time.substring(0,5)) return { available: false, reason: b.title + ' (' + b.user_name + ')' }; }
      return { available: true };
    }
    function renderRooms(rooms, date, startTime, endTime) {
      document.getElementById('content').innerHTML = rooms.map(room => {
        const avail = checkAvailable(room, startTime, endTime);
        return '<div class="room"><h3>' + room.name + '</h3>' +
          (avail.available
            ? '<span class="available">Disponible</span><button onclick="bookRoom(' + JSON.stringify(room.id) + ',' + JSON.stringify(room.name) + ',' + JSON.stringify(date) + ',' + JSON.stringify(startTime) + ',' + JSON.stringify(endTime) + ',this)">Reservar</button>'
            : '<span class="occupied">Ocupada: ' + avail.reason + '</span>') + '</div>';
      }).join('');
    }
    async function bookRoom(roomId, roomName, date, startTime, endTime, btn) {
      btn.disabled = true; btn.textContent = 'Reservando...';
      const email = Office.context.mailbox.userProfile.emailAddress;
      try {
        const res = await fetch(API_URL + '/api/addon/book', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-addon-key': API_KEY }, body: JSON.stringify({ room_id: roomId, date, start_time: startTime, end_time: endTime, title: 'Reunión', user_name: email, user_email: email }) });
        const msg = document.getElementById('msg');
        if (res.status === 201) { msg.innerHTML = '<div class="msg success">' + roomName + ' reservada</div>'; btn.closest('.room').querySelector('span').textContent = 'Reservada por vos'; btn.remove(); }
        else if (res.status === 409) { msg.innerHTML = '<div class="msg error">El horario ya fue reservado</div>'; btn.disabled = false; btn.textContent = 'Reservar'; }
        else { msg.innerHTML = '<div class="msg error">Error al reservar</div>'; btn.disabled = false; btn.textContent = 'Reservar'; }
      } catch { document.getElementById('msg').innerHTML = '<div class="msg error">Error de conexión</div>'; btn.disabled = false; btn.textContent = 'Reservar'; }
    }
  </script>
</body>
</html>`;

router.get('/taskpane.html', (req, res) => {
  const key = process.env.ADDON_API_KEY || '';
  res.type('html').send(TASKPANE_TEMPLATE.replace('%%ADDON_API_KEY%%', key));
});

const ROOMS = [{ id: 'sala-reuniones', name: 'Sala de Reuniones' }, { id: 'sala-multiuso', name: 'Sala Multiuso' }];

function isBlocked(roomId, startTime) {
  if (roomId !== 'sala-multiuso') return false;
  const [h, m] = startTime.split(':').map(Number);
  return h * 60 + m >= 780 && h * 60 + m < 870;
}

function requireApiKey(req, res, next) {
  if (req.headers['x-addon-key'] !== process.env.ADDON_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

let supabase;
function getSupabase() {
  if (!supabase) supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return supabase;
}

router.get('/availability', requireApiKey, async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'date required' });
  const { data, error } = await getSupabase().from('bookings').select('room_id, start_time, end_time, title, user_name').eq('date', date).order('start_time');
  if (error) return res.status(500).json({ error: error.message });
  const result = ROOMS.map(room => ({
    ...room,
    bookings: data.filter(b => b.room_id === room.id),
    blocked: room.id === 'sala-multiuso' ? [{ start: '13:00', end: '14:30', reason: 'Uso interno' }] : []
  }));
  res.json(result);
});

router.post('/book', requireApiKey, async (req, res) => {
  const { room_id, date, start_time, end_time, title, user_name, user_email } = req.body;
  if (!room_id || !date || !start_time || !end_time || !user_email) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const room = ROOMS.find(r => r.id === room_id);
  if (!room) return res.status(400).json({ error: 'Invalid room' });
  if (isBlocked(room_id, start_time)) return res.status(400).json({ error: 'Slot not available' });
  const { data: conflicts } = await getSupabase().from('bookings').select('id').eq('room_id', room_id).eq('date', date).lt('start_time', end_time).gt('end_time', start_time);
  if (conflicts && conflicts.length > 0) return res.status(409).json({ error: 'Slot already booked' });
  const booking = { room_id, room_name: room.name, date, start_time, end_time, title: title || 'Reunión', user_name: user_name || user_email, user_email, calendar_event_id: null };
  const { data, error } = await getSupabase().from('bookings').insert(booking).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

export default router;
