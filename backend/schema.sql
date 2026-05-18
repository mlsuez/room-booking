create table bookings (id uuid primary key default gen_random_uuid(), room_id text not null, room_name text not null, date date not null, start_time time not null, end_time time not null, title text not null default 'Reunión', user_name text not null, user_email text not null, calendar_event_id text, created_at timestamptz default now());
create index bookings_date_idx on bookings(date);
create unique index no_overlap_idx on bookings(room_id, date, start_time);
alter table bookings enable row level security;
create policy "Anyone can read bookings" on bookings for select using (true);
create policy "Anyone can insert bookings" on bookings for insert with check (true);
create policy "Owner can delete their booking" on bookings for delete using (user_email = current_setting('app.user_email', true));
