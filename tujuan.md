Melpin Interactive Space - Tujuan Produk

Ringkas
- Fokus: Frontend dulu, lalu backend belakangan.
- Framework: Next.js App Router + TypeScript.
- Lokasi kerja: folder ini saja.
- Tema: Dark Cute dengan pink yang soft.

Tech Stack (Frontend)
- Next.js App Router (folder app/)
- TypeScript
- Tailwind CSS v4
- lucide-react untuk icon
- LocalStorage untuk state (login, profil, notes, reminders, gallery, poin mingguan)
- Integrasi Gemini via NEXT_PUBLIC_GEMINI_API_KEY (sementara di sisi client)

Fitur Utama (Frontend)
- Login sederhana tanpa username secret
- Setup & edit profil (nama, tanggal lahir, status, bio, avatar)
- Dashboard (sapaan dinamis, umur, poin mingguan, quick navigation)
- Terminal belajar Linux (step-by-step + simulator + rencana AI mentor)
- Chat hub (Real-time + AI) dengan tampilan ala WhatsApp
- Notes (CRUD sticky notes)
- Reminders (tanggal + jam + notifikasi lucu)
- Gallery (upload & simpan foto di browser)
- Responsif untuk semua rasio (HP super kecil, tablet, laptop, desktop)

Phase Frontend
FE-1 - Fondasi UI & Layout
- Setup Next.js App Router + TypeScript + Tailwind
- Global theme tokens (dark + pink soft)
- Layout utama, navigasi, safe-area
- Komponen dasar (card, pill, section title)

FE-2 - Profil & Dashboard
- Setup profil (nama, tanggal lahir, status, bio)
- Edit profil + avatar (emoji + upload foto)
- Sapaan dinamis dan umur
- Poin mingguan + saran

FE-3 - Terminal Interaktif
- Terminal emulator + virtual file system
- Step-by-step tutorial command
- Responsif (mobile/tablet) + input tidak auto-zoom
- Placeholder AI mentor (task otomatis nanti)

FE-4 - Chat Hub
- Mode Real-time (placeholder Firebase)
- Mode AI (Gemini) dengan system prompt
- UI chat ala WhatsApp + typing indicator

FE-5 - Notes, Reminders, Gallery
- Notes (CRUD)
- Reminders (tanggal + jam, permission, notifikasi lucu)
- Gallery (upload & list foto)
- Polishing animasi & micro-interaksi

Rencana Backend (Nanti)
- BE-1: Firebase setup (auth, firestore) untuk real-time chat
- BE-2: API untuk sinkronisasi notes/reminders
- BE-3: AI task generator untuk terminal

Catatan Testing
- Setiap perubahan signifikan: jalankan lint, tsc, build
- Pastikan semua view responsif dan tidak auto-zoom saat input
