#!/bin/bash
set -e

DOMAIN=$1
EMAIL=$2

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "Использование: ./deploy.sh <ваш-домен> <ваш-email>"
    echo "Пример: ./deploy.sh app.my-domain.com admin@my-domain.com"
    exit 1
fi

echo "=== Обновление системы и установка зависимостей ==="
sudo apt update
sudo apt install -y curl git nginx certbot python3-certbot-nginx

echo "=== Установка Docker и Docker Compose ==="
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
fi

echo "=== Настройка .env файла ==="
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Сгенерирован файл .env. Пожалуйста, откройте его (nano .env) и впишите BOT_TOKEN!"
    exit 1
fi

echo "=== Сборка и запуск контейнеров (БД, Бэкенд, Фронтенд) ==="
sudo docker compose up -d --build

echo "=== Настройка Nginx обратного прокси ==="
cat <<EOF | sudo tee /etc/nginx/sites-available/taskbot
server {
    listen 80;
    server_name $DOMAIN;

    # Роутинг для API (Бэкенд)
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    # Роутинг для Фронтенда (Mini App)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/taskbot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

echo "=== Получение SSL сертификата (Let's Encrypt) ==="
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL

echo "=== ГОТОВО! ==="
echo "Ваше приложение развернуто и доступно по адресу: https://$DOMAIN"
echo "Бэкенд и Фронтенд автоматически перезапустятся при ребуте сервера."
