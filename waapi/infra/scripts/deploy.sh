#!/bin/bash
# WaAPI Platform — Sunucuya ilk kurulum scripti
# Kullanim: ./deploy.sh yourdomain.com

set -e

DOMAIN=${1:?"Domain belirtilmedi. Kullanim: ./deploy.sh yourdomain.com"}

echo "=== WaAPI Deploy — $DOMAIN ==="

# 1. Gerekli paketleri kur
echo "[1/5] Sistem guncelleniyor..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-plugin curl git

# Docker'i baslat
sudo systemctl enable docker
sudo systemctl start docker

# 2. Proje dizinine git
cd "$(dirname "$0")/../.."

# 3. .env dosyasinda DOMAIN ayarla
if ! grep -q "^DOMAIN=" .env; then
    echo "DOMAIN=$DOMAIN" >> .env
fi

# 4. SSL sertifikasi al (ilk seferde nginx'siz)
echo "[2/5] SSL sertifikasi aliniyor..."

# Gecici nginx (sadece HTTP, certbot icin)
docker run -d --name temp-nginx \
  -p 80:80 \
  -v $(pwd)/infra/nginx/certbot-init.conf:/etc/nginx/conf.d/default.conf:ro \
  -v certbot_data:/var/www/certbot \
  nginx:alpine

# Certbot ile sertifika al
docker run --rm \
  -v certbot_data:/var/www/certbot \
  -v letsencrypt_data:/etc/letsencrypt \
  certbot/certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  -d "$DOMAIN" \
  --email "admin@$DOMAIN" \
  --agree-tos --no-eff-email

# Gecici nginx'i durdur
docker stop temp-nginx && docker rm temp-nginx

# 5. nginx.conf'da domain'i ayarla
echo "[3/5] Nginx yapilandiriliyor..."
sed -i "s/\${DOMAIN}/$DOMAIN/g" infra/nginx/nginx.conf

# 6. Docker Compose ile calistir
echo "[4/5] Servisler baslatiliyor..."
docker compose -f docker-compose.prod.yml up -d --build

# 7. Veritabani migration
echo "[5/5] Veritabani migration..."
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head

echo ""
echo "=== Deploy tamamlandi! ==="
echo "https://$DOMAIN adresinden erisebilirsiniz."
echo ""
echo "Meta Webhook URL: https://$DOMAIN/api/v1/webhook/meta"
echo ""
