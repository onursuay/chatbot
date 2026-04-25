# Proje Talimatları

## Otomatik PROGRESS.md Kaydı

Her konuşmanın sonunda, eğer net olumlu bir değişiklik yapıldıysa (bug fix, yeni özellik, iyileştirme, sorun çözümü), `PROGRESS.md` dosyasına aşağıdaki formatta ekle:

```
## YYYY-MM-DD

### Çözülen Sorunlar / Yapılan İyileştirmeler
- [Kısa açıklama — ne değişti, neden önemli]
- ...

---
```

Eklemek için `PROGRESS.md` dosyasını oku (yoksa oluştur), yeni girişi en üste ekle.

Eklenecek durumlar:
- Bug fix (hata düzeltme)
- Yeni özellik ekleme
- Performans / UX iyileştirmesi
- Kritik config / deployment düzeltmesi

Eklenmeyecek durumlar:
- Sadece açıklama veya araştırma yapılan konuşmalar
- Kod değişikliği olmayan konuşmalar

---

## i18n Zorunluluğu — Dil Desteği Kuralı

**ZORUNLU:** Tüm değişiklikler TR/EN dil seçeneğine uygun çalışmalı. Bu kural asla ihlal edilemez.

### UI Metinleri
- Yeni bir UI metni eklerken ÖNCE `/src/lib/i18n.ts` dosyasına translation key ekle (hem `tr` hem `en` değeriyle)
- Component'te her zaman `t("key")` kullan — asla hardcoded string yazma
- `lang === "tr" ? "..." : "..."` pattern'i YASAK — yerine `t()` kullan

### Sayfa Route'ları
- Sayfa dizinleri (`/src/app/[lang]/`) her zaman **İngilizce slug** ile adlandırılmalı (örn. `companies`, `leads`, `tasks`, `activity-log`)
- Yeni sayfa eklerken **iki yerde** güncelleme zorunlu:
  1. `/src/lib/i18n.ts` → `SLUG_MAP`'e TR ve EN slug'ı ekle
  2. `/src/middleware.ts` → `TR_TO_EN` map'ine TR slug → EN slug mapping'i ekle
