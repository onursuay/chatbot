-- ============================================================
-- Migration: conversations tablosuna "channel" kolonu ekle
-- Tarih: 2026-04-02
-- Neden: metadata JSONB içindeki channel alanı doğrudan
--        SQL filter ile sorgulanamıyor. Ayrı kolon daha
--        performanslı ve explicit.
-- ============================================================

-- 1. Kolon ekle (zaten varsa hata vermez)
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS channel text;

-- 2. Mevcut kayıtları metadata'dan backfill et
UPDATE conversations
SET channel = metadata->>'channel'
WHERE channel IS NULL
  AND metadata->>'channel' IS NOT NULL;

-- 3. phone_number_id olan ve channel hâlâ null olan kayıtlar WhatsApp
UPDATE conversations
SET channel = 'whatsapp'
WHERE channel IS NULL
  AND phone_number_id IS NOT NULL;

-- 4. channel_account_id ile eşleşen kayıtların channel'ını
--    channel_accounts.channel'dan doldur
UPDATE conversations c
SET channel = ca.channel
FROM channel_accounts ca
WHERE c.channel_account_id = ca.id
  AND c.channel IS NULL;

-- 5. Hâlâ null olanları varsayılan olarak 'whatsapp' yap
UPDATE conversations
SET channel = 'whatsapp'
WHERE channel IS NULL;

-- 6. İndeks ekle (filtre performansı için)
CREATE INDEX IF NOT EXISTS idx_conversations_org_channel
  ON conversations(org_id, channel);

-- 7. channel_account_id üzerinde de indeks (yeni conversation lookup sorgusu için)
CREATE INDEX IF NOT EXISTS idx_conversations_channel_account
  ON conversations(org_id, contact_id, channel_account_id)
  WHERE channel_account_id IS NOT NULL;

-- ============================================================
-- Supabase Dashboard > SQL Editor'da çalıştır.
-- Ardından uygulamayı yeniden deploy et.
-- ============================================================
