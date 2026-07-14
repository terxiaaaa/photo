import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import './App.css'

type Layout = 'vertical' | 'grid'
type Theme = 'dark' | 'light' | 'color'
type Screen = 'home' | 'create' | 'join' | 'shoot' | 'result'

type Room = {
  code: string
  layout: Layout
  theme: Theme
  host_photos: string[]
  guest_photos: string[]
}

const frames = [0, 1, 2, 3]

function makeCode() {
  return Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('')
}

function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [layout, setLayout] = useState<Layout>('vertical')
  const [theme, setTheme] = useState<Theme>('dark')
  const [room, setRoom] = useState<Room | null>(null)
  const [role, setRole] = useState<'host' | 'guest'>('host')
  const [joinCode, setJoinCode] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const camera = useRef<HTMLVideoElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [cameraOn, setCameraOn] = useState(false)

  useEffect(() => {
    if (!room) return
    const channel = supabase
      .channel(`room-${room.code}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${room.code}` }, (payload) => {
        setRoom(payload.new as Room)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [room?.code])

  useEffect(() => () => stopCamera(), [])

  async function createRoom() {
    setBusy(true); setError('')
    const code = makeCode()
    const newRoom: Room = { code, layout, theme, host_photos: [], guest_photos: [] }
    const { error: insertError } = await supabase.from('rooms').insert(newRoom)
    setBusy(false)
    if (insertError) { setError('Tidak bisa membuat room. Cek konfigurasi Supabase.'); return }
    setRoom(newRoom); setRole('host'); setPhotos([]); setScreen('shoot')
  }

  async function joinRoom() {
    setBusy(true); setError('')
    const { data, error: fetchError } = await supabase.from('rooms').select('*').eq('code', joinCode.trim().toUpperCase()).single()
    setBusy(false)
    if (fetchError || !data) { setError('Kode room tidak ditemukan.'); return }
    setRoom(data as Room); setRole('guest'); setPhotos((data as Room).guest_photos ?? []); setScreen('shoot')
  }

  async function savePhotos(nextPhotos: string[]) {
    if (!room) return
    setPhotos(nextPhotos)
    const field = role === 'host' ? 'host_photos' : 'guest_photos'
    const { data, error: updateError } = await supabase.from('rooms').update({ [field]: nextPhotos }).eq('code', room.code).select().single()
    if (updateError) setError('Foto tersimpan lokal, tapi gagal sinkron ke room.')
    if (data) setRoom(data as Room)
  }

  function addPhoto(file: File) {
    if (photos.length >= 4) return
    const reader = new FileReader()
    reader.onload = () => savePhotos([...photos, reader.result as string])
    reader.readAsDataURL(file)
  }

  async function openCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      if (camera.current) { camera.current.srcObject = stream; setCameraOn(true) }
    } catch { setError('Kamera tidak tersedia. Pilih foto dari perangkat.') }
  }

  function stopCamera() {
    const stream = camera.current?.srcObject as MediaStream | null
    stream?.getTracks().forEach((track) => track.stop())
    if (camera.current) camera.current.srcObject = null
    setCameraOn(false)
  }

  function capture() {
    if (!camera.current || !canvas.current || photos.length >= 4) return
    const context = canvas.current.getContext('2d')
    canvas.current.width = camera.current.videoWidth; canvas.current.height = camera.current.videoHeight
    context?.drawImage(camera.current, 0, 0)
    savePhotos([...photos, canvas.current.toDataURL('image/jpeg', 0.9)])
  }

  function download() {
    const source = document.querySelector('.final-strip') as HTMLElement
    if (!source) return
    const node = source.cloneNode(true) as HTMLElement
    const width = 1000; const height = room?.layout === 'vertical' ? 3000 : 1400
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${new XMLSerializer().serializeToString(node)}</foreignObject></svg>`
    const img = new Image()
    img.onload = () => { const c = document.createElement('canvas'); c.width = width; c.height = height; c.getContext('2d')?.drawImage(img, 0, 0); const link = document.createElement('a'); link.download = `couple-photobooth-${room?.code}.png`; link.href = c.toDataURL('image/png'); link.click() }
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  }

  if (screen === 'home') return <main className="landing"><header><a className="brand" href="#home">Couple Photobooth.</a><span>01. about</span><span>02. how it works</span><span>03. made with love</span></header><section className="hero"><p className="eyebrow">LONG DISTANCE, STILL TOGETHER</p><h1>Fun dates for<br /><i>two screens.</i></h1><p className="intro">Buat photostrip bersama, walau terpisah kota. Satu room, dua kamera, satu kenangan.</p><div className="actions"><button onClick={() => setScreen('create')}>Mulai sesi <Arrow /></button><button className="quiet" onClick={() => setScreen('join')}>Gabung room</button></div></section><footer><span>Created by @terxiaaaa</span><span>SCROLL TO CREATE</span></footer></main>

  if (screen === 'create') return <main className="maker"><Back onClick={() => setScreen('home')} /><p className="step">01 / 02</p><h2>Pilih bentuk strip</h2><div className="choices"><button className={`layout-card ${layout === 'vertical' ? 'selected' : ''}`} onClick={() => setLayout('vertical')}><StripIcon vertical /><b>1 × 4</b></button><button className={`layout-card ${layout === 'grid' ? 'selected' : ''}`} onClick={() => setLayout('grid')}><StripIcon /><b>2 × 2</b></button></div><p className="step second">02 / 02</p><h2>Pilih warna border</h2><div className="themes">{(['dark', 'light', 'color'] as Theme[]).map((item) => <button key={item} className={`theme ${item} ${theme === item ? 'active' : ''}`} onClick={() => setTheme(item)}><span></span>{item === 'color' ? 'random' : item}</button>)}</div>{error && <p className="error">{error}</p>}<button className="primary next" disabled={busy} onClick={createRoom}>{busy ? 'Membuat room...' : 'Buat room'} <Arrow /></button></main>

  if (screen === 'join') return <main className="join"><Back onClick={() => setScreen('home')} /><p className="eyebrow">JOIN YOUR PERSON</p><h2>Masuk ke room.</h2><p>Masukkan kode enam karakter dari pasanganmu.</p><label htmlFor="room-code">KODE ROOM</label><input id="room-code" value={joinCode} maxLength={6} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="ABC123" /><button className="primary" disabled={busy || joinCode.length < 6} onClick={joinRoom}>{busy ? 'Mencari...' : 'Gabung sesi'} <Arrow /></button>{error && <p className="error">{error}</p>}</main>

  const partnerPhotos = role === 'host' ? room?.guest_photos ?? [] : room?.host_photos ?? []
  if (screen === 'result' && room) return <main className="result"><button className="brand" onClick={() => setScreen('shoot')}>couple photobooth.</button><p className="eyebrow">YOUR SHARED MOMENT</p><h2>Strip selesai.</h2><p>Room {room.code}. Simpan kenangan ini sebelum sesi berakhir.</p><Preview layout={room.layout} theme={room.theme} left={role === 'host' ? photos : partnerPhotos} right={role === 'host' ? partnerPhotos : photos} /><button className="primary" onClick={download}>Download PNG <Arrow /></button><button className="text-button" onClick={() => setScreen('shoot')}>Kembali ke sesi</button></main>
  return <main className="shoot"><div className="shoot-top"><button className="brand" onClick={() => setScreen('home')}>couple photobooth.</button><span>{role === 'host' ? 'KAMU MEMBUAT ROOM' : 'KAMU BERGABUNG KE ROOM'}</span><span className="room-code">ROOM: {room?.code}</span></div><div className="shoot-content"><section className="camera-area"><p className="counter">{photos.length + 1} / 4</p><div className="camera-box">{cameraOn ? <video ref={camera} autoPlay playsInline muted /> : <div className="camera-empty"><span>+</span><p>Aktifkan kamera atau pilih foto</p></div>}</div><canvas ref={canvas} hidden /><div className="camera-actions">{cameraOn ? <><button className="capture" onClick={capture} aria-label="Ambil foto"></button><button className="small-button" onClick={stopCamera}>Tutup kamera</button></> : <><button className="primary" onClick={openCamera}>Buka kamera</button><button className="small-button" onClick={() => fileInput.current?.click()}>Pilih foto</button></>}<input ref={fileInput} hidden type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && addPhoto(event.target.files[0])} /></div><div className="shots">{frames.map((index) => <div className="shot" key={index}>{photos[index] && <img src={photos[index]} alt={`Foto kamu ${index + 1}`} />}</div>)}</div></section><aside><p className="eyebrow">LIVE PREVIEW</p><Preview layout={room?.layout ?? 'vertical'} theme={room?.theme ?? 'dark'} left={role === 'host' ? photos : partnerPhotos} right={role === 'host' ? partnerPhotos : photos} /><p className="waiting">{partnerPhotos.length ? `Pasangan sudah mengisi ${partnerPhotos.length}/4 foto.` : 'Menunggu pasangan masuk dan mengisi foto.'}</p>{photos.length > 0 && <button className="primary" onClick={() => setScreen('result')}>Lihat hasil <Arrow /></button>}</aside></div>{error && <p className="error floating">{error}</p>}</main>
}

function Preview({ layout, theme, left, right }: { layout: Layout; theme: Theme; left: string[]; right: string[] }) {
  return <div className={`final-strip ${layout} ${theme}`}>{frames.map((index) => <div className="strip-photo" key={index}><div>{left[index] && <img src={left[index]} alt="Foto orang pertama" />}</div><div>{right[index] && <img src={right[index]} alt="Foto orang kedua" />}</div></div>)}<b>COUPLE<br />PHOTOBOOTH</b></div>
}

function Arrow() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg> }
function Back({ onClick }: { onClick: () => void }) { return <button className="back" onClick={onClick}><Arrow /> Kembali</button> }
function StripIcon({ vertical = false }: { vertical?: boolean }) { return <span className={`strip-icon ${vertical ? 'vertical' : ''}`}>{frames.map((frame) => <i key={frame}></i>)}</span> }

export default App
