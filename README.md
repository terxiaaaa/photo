# Couple Photobooth

Photobooth online untuk dua orang. Host membuat room, memilih strip dan border. Guest masuk memakai kode room. Kedua sisi foto sinkron langsung memakai Supabase Realtime.

## Jalankan

1. Salin `.env.example` menjadi `.env`.
2. Buka Supabase SQL Editor, jalankan `supabase/schema.sql`.
3. Jalankan `npm install` lalu `npm run dev`.

## Deploy Vercel

1. Push folder ini ke GitHub.
2. Import repository pada Vercel.
3. Tambahkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` dari `.env.example` ke Environment Variables Vercel.
4. Deploy. Build command: `npm run build`.

Publishable key aman dipakai pada aplikasi browser. Jangan masukkan Supabase `service_role` key ke Vercel atau repository.
