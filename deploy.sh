#!/bin/bash
set -e

cd /home/ubuntu/bookmyseat

# Create 1GB swap if not already present (prevents OOM kills on t3.micro)
if [ ! -f /swapfile ]; then
  echo "Creating 1GB swap file..."
  sudo fallocate -l 1G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
else
  sudo swapon /swapfile 2>/dev/null || true
fi
echo "Swap status:"
free -m

echo "Setting up .env"
cat > .env << 'EOF'
NODE_ENV=production
POSTGRES_USER=flashdrop
POSTGRES_PASSWORD=flashdropprodpw123
POSTGRES_DB=flashdrop
DATABASE_URL=postgresql://flashdrop:flashdropprodpw123@localhost:5432/flashdrop?schema=public
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=flashdrop-platform
KAFKA_GROUP_ID=order-worker-group
KAFKA_TOPIC_RESERVATION_CREATED=reservation.created
API_PORT=3000
API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://13.51.249.95/api
NEXT_PUBLIC_SOCKET_URL=http://13.51.249.95
SOCKET_GATEWAY_PORT=3002
SOCKET_REDIS_CHANNEL=flashdrop:socket-events
DEMO_PRODUCT_ID=demo-product
DEMO_INITIAL_STOCK=100
RESERVATION_TTL_SECONDS=120
JWT_SECRET=f98efea0398ef0aef03ae9d8e3fd83a0f12c98d
EMAIL_USER=akshatpib@gmail.com
EMAIL_PASS="uhcb ldzo esfn xowg"
EOF

echo "Setting up Nginx Config"
cat > infra/nginx/nginx.conf << 'EOF'
events {}

http {
  upstream flashdrop_api {
    server 127.0.0.1:3000;
  }

  upstream flashdrop_web {
    server 127.0.0.1:3001;
  }

  upstream flashdrop_socket {
    server 127.0.0.1:3002;
  }

  server {
    listen 80;

    location /socket.io/ {
      proxy_pass http://flashdrop_socket/socket.io/;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
      proxy_set_header Host $host;
    }

    location /api/ {
      proxy_pass http://flashdrop_api/api/;
      proxy_set_header Host $host;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Request-Id $request_id;
    }

    location = /health {
      proxy_pass http://flashdrop_api/health;
      proxy_set_header Host $host;
    }

    location / {
      proxy_pass http://flashdrop_web;
      proxy_set_header Host $host;
    }
  }
}
EOF

echo "Starting Docker Infra"
docker compose up -d

echo "Installing Node.js and PM2"
if ! command -v node &> /dev/null
then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs nginx
fi
sudo npm install -g pm2

echo "Stopping existing PM2 processes to free RAM"
pm2 delete all || true

echo "Building Application (excluding web - built locally)"
npm install && npm cache clean --force
npm run prisma:generate
npm --workspace @flashdrop/shared run build
npm --workspace @flashdrop/database run build
npm --workspace @flashdrop/api run build
npm --workspace @flashdrop/order-worker run build
npm --workspace @flashdrop/socket-gateway run build

echo "Seeding Database"
npx prisma db push --force-reset --schema packages/database/prisma/schema.prisma
npm run db:seed

echo "Starting Apps with PM2"
pm2 start npm --name "api" -- run start --workspace @flashdrop/api
pm2 start npm --name "worker" -- run start --workspace @flashdrop/order-worker
pm2 start npm --name "socket" -- run start --workspace @flashdrop/socket-gateway
pm2 start npm --name "web" -- run start --workspace @flashdrop/web
pm2 save

echo "Setting up PM2 startup"
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null || true
pm2 save

echo "Restarting Nginx"
sudo cp infra/nginx/nginx.conf /etc/nginx/nginx.conf
sudo systemctl restart nginx
echo "Deployment successful!"
