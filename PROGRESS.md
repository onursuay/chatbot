# Proje İlerleme Kaydı

---

## 2026-04-14 (5)

### Çözülen Sorunlar / Yapılan İyileştirmeler
- Landing page header referans projeyle birebir eşleştirildi: `sticky top-0 z-50 bg-[#060609]/80 backdrop-blur-2xl` tam genişlik tasarım, `rounded-2xl bg-sidebar/90` pill-box yapısı kaldırıldı
- Nav: bireysel emerald pill butonlar (`border border-emerald-400/30 text-emerald-400 rounded-full`), "Ürün/Product" ve "Entegrasyonlar/Integrations" hover dropdown menüleri (chatbot'a özel içerik: Gelen Kutusu, AI Chatbot, CRM, Toplu Mesaj, Otomasyon, Analiz; WhatsApp, Instagram, Facebook, Web Chat entegrasyonları)
- Sağ CTA: Giriş (düz metin) + Görüşme Planla (outline pill) + 7 Gün Ücretsiz Dene (filled pill)
- Alt gradient çizgisi: `h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent`
- Mobil menü dark stile dönüştürüldü (`bg-[#0d0f12]/95 border-t border-white/[0.06]`)
- Hero section top padding düzeltildi (header artık `sticky` olduğu için `pt-20 md:pt-28` → `pt-12 md:pt-20`)
- TypeScript derleme temiz

---

## 2026-04-14 (4)

### Çözülen Sorunlar / Yapılan İyileştirmeler
- Ayarlar sayfası (Settings) tamamen yeniden tasarlandı: section header'larına ikon + açıklama eklendi, label-value satırları `InfoRow` bileşeniyle tutarlı hale getirildi, profil kartına avatar (initials) ve badge eklendi, bağlantı durumu için yeşil banner, hata için uyarı ikonu ile styled mesaj kutusu

---

## 2026-04-14 (3)

### Çözülen Sorunlar / Yapılan İyileştirmeler
- Sidebar kullanıcı menüsü referans projedeki gibi dropdown'a dönüştürüldü: avatar + isim + plan trigger, açılınca Ayarlar / Abonelik / Ekip linkleri, dil alt menüsü (TR/EN checkmark ile), kırmızı çıkış butonu
- Header'daki dil toggle ve çıkış butonları kaldırıldı (artık kullanıcı menüsünde mevcut)
- TypeScript derleme temiz

---

## 2026-04-14 (2)

### Çözülen Sorunlar / Yapılan İyileştirmeler
- Landing page dark theme: `bg-white text-ink` → `bg-[#060609] text-white`; tüm section/card/sub-component stilleri referans projeyle eşleştirildi (emerald glow, dark glass cards, gradient text güncellendi)
- Cookie Policy, Terms of Service, Data Deletion sayfaları Privacy Policy ile aynı tasarım standardına getirildi: emerald glow container, logo header, copyright footer, `text-[14px] text-[#8a8f98]` body text
- Register sayfasına interaktif terms & privacy checkbox eklendi (link'ler yasal sayfalara yönlendiriyor, checkbox işaretlenmeden form submit edilemiyor)
- globals.css: `.landing-gradient-text` emerald/teal/cyan gradyana güncellendi; `.landing-btn-secondary` dark glass stiline alındı
- TypeScript derleme temiz

---

## 2026-04-14

### Çözülen Sorunlar / Yapılan İyileştirmeler
- Landing page tam i18n desteği: dil seçici İngilizce'ye geçildiğinde artık tüm sayfa alanları İngilizce'ye çevriliyor (nav, hero, sidebar, chat mock, stats, features, how it works, AI showcase, channels, pricing, comparison table, testimonials, final CTA, footer)
- `T` (translations) sabit objesi eklendi; `const t = T[lang]` ile tüm metin referansları dil bağımsız hale getirildi
- TypeScript hatası yok, derleme temiz

---

## 2026-04-13 (3)

### Çözülen Sorunlar / Yapılan İyileştirmeler
- Channel Management → Meta Account kartına "Connected Facebook Page" bilgi bloğu eklendi (hardcoded: Ustasını Yolla / Page ID: 485310411915762). Meta App Review sürecinde `pages_manage_metadata` izninin Facebook Page'e bağlı olduğunu açıkça göstermek için. Sadece `isConnected` true iken görünür, mevcut tasarım/akış bozulmadı.

---

## 2026-04-13 (2)

### Çözülen Sorunlar / Yapılan İyileştirmeler
- Privacy Policy sayfasına giriş yapılmadan erişildiğinde login'e yönlendirme sorunu düzeltildi: layout.tsx auth useEffect içine `isNoLayoutPage` kontrolü eklendi, artık public sayfalar (privacy-policy, terms-of-service vb.) token olmadan doğrudan açılıyor

---

## 2026-04-13

### Çözülen Sorunlar / Yapılan İyileştirmeler
- Landing page footer voice_agent referans projesiyle aynı tasarıma getirildi: siyah minimal footer, dil toggle dropdown (🇹🇷/🇬🇧), yasal linkler
- Policy sayfaları (privacy-policy, terms-of-service, data-deletion, cookie-policy) logo header ve footer link bölümü eklenerek voice_agent tasarım standardına uygun hale getirildi
- Meta Developer'a verilen /en/ URL'lerinin (/en/privacy-policy, /en/terms-of-service, /en/data-deletion) doğru İngilizce içerik döndürdüğü doğrulandı

---

## Proje Genel Bilgisi

### Teknoloji Yığını
- **Framework:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Veritabanı:** Supabase (PostgreSQL + Storage + Auth)
- **AI:** Google Gemini API (chatbot + PDF metin çıkarma)
- **Mesajlaşma:** WhatsApp Business API (Meta / WABA)
- **State:** Zustand
- **Deploy:** Vercel (server-side `bodySizeLimit: 35mb`)
- **Auth:** JWT (`jose`) + bcryptjs, middleware ile korumalı rotalar

### Proje Yapısı
```
src/
├── app/
│   ├── [lang]/          # TR/EN dil segmenti (tüm uygulama sayfaları)
│   │   ├── inbox/       → gelen-kutusu
│   │   ├── contacts/    → kisiler
│   │   ├── broadcast/   → toplu-mesaj
│   │   ├── templates/   → sablonlar
│   │   ├── chatbot/     → sohbet-botu
│   │   ├── channels/    → kanallar
│   │   ├── knowledge-base/
│   │   ├── analytics/
│   │   ├── billing/
│   │   ├── settings/
│   │   └── ...
│   ├── api/             # Next.js API route'ları
│   │   ├── conversations/
│   │   ├── contacts/
│   │   ├── broadcasts/
│   │   ├── templates/
│   │   ├── channels/
│   │   ├── knowledge-base/
│   │   ├── meta/        (Meta OAuth + embedded signup)
│   │   ├── webhook/     (WhatsApp webhook)
│   │   └── ...
│   └── landing/         # Açılış sayfası
├── lib/
│   ├── supabase.ts      # Frontend client (anon) + server client (service_role)
│   ├── gemini.ts        # Gemini API entegrasyonu
│   ├── whatsapp.ts      # WhatsApp mesaj gönderme
│   ├── i18n.ts          # TR/EN çeviri sistemi
│   ├── api.ts           # Ortak API yardımcıları
│   ├── auth.ts          # Auth yardımcıları
│   └── jwt.ts           # JWT işlemleri
├── components/
│   ├── inbox/
│   ├── contacts/
│   ├── shared/
│   └── ui/
├── hooks/               # React custom hooks
└── middleware.ts        # Dil yönlendirme + auth koruma
```

### Çalışma Şekli
1. **URL Yapısı:** `/tr/gelen-kutusu` veya `/en/inbox` — middleware dil tespiti + TR slug → EN canonical çevirisi yapar
2. **Auth:** JWT token cookie'de saklanır, middleware her istekte doğrular, korumasız rotalar whitelist'te
3. **WhatsApp Akışı:** Meta webhook → `/api/webhook` → gelen mesaj Supabase'e yazılır → AI yanıtı Gemini ile üretilir → WhatsApp API ile gönderilir
4. **Knowledge Base:** PDF yüklenir → Supabase Storage'a kaydedilir → Gemini API ile metin çıkarılır → embedding/arama için saklanır
5. **Broadcast:** Şablon seçilir → kişi listesi filtrelenir → toplu WhatsApp mesajı gönderilir
6. **Çok Dil:** `i18n.ts` üzerinden TR/EN anahtar-değer çevirisi, URL segmentine göre aktif dil belirlenir

### Önemli Notlar
- Supabase'de **iki client** var: `supabase` (anon/RLS) ve `getServiceSupabase()` (service_role/RLS bypass) — API route'larında hangisinin kullanıldığına dikkat et
- Vercel'de `@napi-rs/canvas` ve `pdfjs-dist` worker **çalışmaz** — PDF işlemleri Gemini'ye yönlendirilmeli
- WhatsApp için birden fazla hesap (WABA) destekleniyor, runtime'da account ID ile seçiliyor

---

## 2026-04-09

### Otomasyon Kurulumu
- `Stop` hook eklendi: Her konuşma sonunda otomatik `git add -A → commit → push` yapılır
- `CLAUDE.md` oluşturuldu: Claude'a her konuşma sonunda `PROGRESS.md`'ye otomatik kayıt talimatı verildi

---

## Geçmiş — Önemli Çözümler (Git Geçmişinden)

### PDF Çıkarma Sistemi
- **Sorun:** `pdfjs-dist` ve `@napi-rs/canvas` Vercel'de çalışmıyordu (`DOMMatrix` eksikliği, worker uyumsuzluğu)
- **Çözüm:** PDF metin çıkarma tamamen Gemini API'ye taşındı; `pdfjs-dist` worker devre dışı bırakıldı; `DOMMatrix` polyfill eklendi
- İlgili commitler: `8e129e8`, `0b775ca`, `6994668`, `6d43bef`, `de40441`, `3e1a1b9`

### WhatsApp / Meta Entegrasyonu
- Meta OAuth yönlendirmesinde dil korunuyor (`b61dece`)
- Header'da gerçek Meta bağlantı durumu gösteriliyor (`f3a48f8`)
- WhatsApp token fallback ve runtime mapping düzeltildi (`b956f3e`, `13e8997`, `bb733c2`)

### AI Chatbot İyileştirmeleri
- Türkçe isme göre cinsiyet tespiti ve kibarca hitap (`986ed8c`)
- Konuşma akışı ve küfür yönetimi iyileştirildi (`7345b6e`)
- Token limiti 1024'e yükseltildi, cevap kesilmesi engellendi (`a0c0090`, `af91899`)
- Bot adı Ceylin olarak yeniden adlandırıldı (`67dcf9b`)

### Yayın (Broadcast) Sayfası
- Kişi önizleme, etiket filtre dropdown, loading skeleton, TR/EN desteği eklendi (`37f48b9`)

### Arayüz / UX
- Tab ikonları emoji yerine SVG vektörlere dönüştürüldü (`856a49c`)
- Şablon (template) sayfası: silme, loading skeleton, geniş input, placeholder, varsayılan dil düzeltmeleri (`e61acbe`, `8681f28`)
- Inbox sohbet baloncukları ve hesap etiketleri iyileştirildi (`3cb551a`, `b38828d`, `31d0646`)

### i18n / Çeviriler
- Duplicate `new_campaign_form` anahtarı düzeltildi (`661d226`)
- Duplicate `deleting` anahtarı düzeltildi (`7de02df`)

### Dil / URL
- Sayfa yenilemede URL'deki dil segmenti korunuyor, lang sıfırlanmıyor (`de0bffa`)

### Knowledge Base
- PDF çıkarma akışı storage upload üzerinden yönlendirildi (`4c71717`)
- PDF extract debug detayları hata yanıtlarına eklendi (`b5a49f2`)

---
