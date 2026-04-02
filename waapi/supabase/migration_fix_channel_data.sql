-- ============================================================
-- Corrective Migration: Yanlış channel değerlerini düzelt
-- Tarih: 2026-04-02
-- Neden: ig_ prefix'li contact'a bağlı conversations yanlışlıkla
--        channel='whatsapp' almış olabilir.
-- ============================================================

-- 1. channel_account_id'si olan conversations → o account'ın channel'ını kullan
UPDATE conversations c
SET channel = ca.channel
FROM channel_accounts ca
WHERE c.channel_account_id = ca.id
  AND (c.channel IS NULL OR c.channel != ca.channel);

-- 2. ig_ prefix'li contact'a bağlı ama channel='whatsapp' olan conversations
--    (channel_account_id yoksa ve metadata'da instagram yoksa bile)
UPDATE conversations c
SET channel = 'instagram'
FROM contacts ct
WHERE c.contact_id = ct.id
  AND ct.wa_id LIKE 'ig_%'
  AND c.channel = 'whatsapp'
  AND c.channel_account_id IS NULL;

-- 3. fb_ prefix'li contact → facebook
UPDATE conversations c
SET channel = 'facebook'
FROM contacts ct
WHERE c.contact_id = ct.id
  AND ct.wa_id LIKE 'fb_%'
  AND c.channel = 'whatsapp'
  AND c.channel_account_id IS NULL;

-- 4. metadata.channel varsa ve channel kolonu farklıysa düzelt
UPDATE conversations
SET channel = metadata->>'channel'
WHERE metadata->>'channel' IS NOT NULL
  AND metadata->>'channel' != ''
  AND (channel IS NULL OR channel != metadata->>'channel')
  AND metadata->>'channel' IN ('instagram', 'facebook', 'messenger', 'whatsapp');

-- 5. Sonucu doğrula
SELECT channel, count(*) FROM conversations GROUP BY channel ORDER BY count DESC;

-- ============================================================
-- Supabase Dashboard > SQL Editor'da çalıştır.
-- ============================================================
