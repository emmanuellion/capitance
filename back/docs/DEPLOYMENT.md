# Deployment Guide - Capitance Backend

This guide covers deploying the Capitance backend to production.

## Prerequisites

### Required Software
- **Node.js** 20.x or higher
- **MongoDB** 6.0+ (MongoDB Atlas or self-hosted)
- **Redis** 7.0+ (required for production caching and real-time prices)
- **Domain** with valid SSL certificate
- **Reverse Proxy** (Nginx recommended)

### Recommended Infrastructure
- **Memory:** Minimum 2GB RAM, 4GB+ recommended
- **CPU:** 2+ cores
- **Storage:** 20GB+ (depends on user uploads)
- **Network:** Stable connection for API calls to price providers

---

## Environment Variables

### Critical Production Variables

Create a `.env` file in the `back/` directory:

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# CORS - Production Origins (comma-separated)
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com

# MongoDB Connection (Use MongoDB Atlas or secure connection)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/capitance?retryWrites=true&w=majority

# Redis Configuration (REQUIRED in production)
REDIS_ENABLED=true
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
REDIS_KEY_PREFIX=capitance:
REDIS_DEFAULT_TTL=300

# JWT Secrets (MUST be changed from defaults!)
# Generate secure secrets: openssl rand -base64 32
JWT_ACCESS_SECRET=your-production-access-secret-min-32-chars
JWT_REFRESH_SECRET=your-production-refresh-secret-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
JWT_REFRESH_EXPIRY_REMEMBER=30d

# Cookie Configuration (IMPORTANT for production)
COOKIE_DOMAIN=your-domain.com
COOKIE_SECURE=true
COOKIE_SAME_SITE=strict

# Email Configuration
EMAIL_SERVICE=smtp
SMTP_HOST=smtp.your-email-provider.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
EMAIL_FROM=noreply@your-domain.com
EMAIL_FROM_NAME=Capitance

# Frontend URL
FRONTEND_URL=https://your-domain.com

# Password Requirements
MIN_PASSWORD_LENGTH=8

# Stock Price APIs (at least one required)
TWELVE_DATA_API_KEY=your-twelve-data-api-key
TWELVE_DATA_CACHE_TTL=120
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-key
```

### Security Checklist

- [ ] Change all default secrets (JWT_ACCESS_SECRET, JWT_REFRESH_SECRET)
- [ ] Set COOKIE_SECURE=true
- [ ] Use strong MongoDB credentials
- [ ] Enable Redis authentication
- [ ] Set secure CORS origins
- [ ] Configure SMTP for production emails
- [ ] Enable rate limiting (default is enabled)

---

## Deployment Methods

### Option 1: Docker Deployment (Recommended)

#### 1. Create Dockerfile

**File:** `back/Dockerfile`

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy dependencies and build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Create uploads directory
RUN mkdir -p /app/uploads

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

#### 2. Create docker-compose.yml

**File:** `docker-compose.yml` (in project root)

```yaml
version: '3.8'

services:
  backend:
    build: ./back
    container_name: capitance-backend
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - ./back/.env
    volumes:
      - ./back/uploads:/app/uploads
      - ./back/logs:/app/logs
    depends_on:
      - mongodb
      - redis
    networks:
      - capitance-network

  frontend:
    build: ./front
    container_name: capitance-frontend
    restart: unless-stopped
    ports:
      - "3001:3000"
    depends_on:
      - backend
    networks:
      - capitance-network

  mongodb:
    image: mongo:7
    container_name: capitance-mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: your-strong-password
      MONGO_INITDB_DATABASE: capitance
    volumes:
      - mongodb-data:/data/db
    ports:
      - "27017:27017"
    networks:
      - capitance-network

  redis:
    image: redis:7-alpine
    container_name: capitance-redis
    restart: unless-stopped
    command: redis-server --requirepass your-redis-password
    volumes:
      - redis-data:/data
    ports:
      - "6379:6379"
    networks:
      - capitance-network

volumes:
  mongodb-data:
  redis-data:

networks:
  capitance-network:
    driver: bridge
```

#### 3. Deploy with Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build backend
```

---

### Option 2: Traditional Deployment (PM2)

#### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install MongoDB (or use MongoDB Atlas)
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org

# Install Redis
sudo apt install redis-server
sudo systemctl enable redis-server
```

#### 2. Deploy Application

```bash
# Clone repository
cd /opt
sudo git clone https://github.com/your-repo/capitance.git
cd capitance/back

# Install dependencies
npm ci --only=production

# Build TypeScript
npm run build

# Set up environment
sudo cp .env.example .env
sudo nano .env  # Edit with production values
```

#### 3. PM2 Configuration

**File:** `ecosystem.config.js`

```javascript
module.exports = {
  apps: [{
    name: 'capitance-backend',
    script: './dist/index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
    watch: false
  }]
};
```

#### 4. Start with PM2

```bash
# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Enable PM2 on system startup
pm2 startup

# Monitor
pm2 monit

# View logs
pm2 logs capitance-backend

# Restart after updates
cd /opt/capitance/back
git pull
npm ci --only=production
npm run build
pm2 restart capitance-backend
```

---

## Nginx Reverse Proxy

### Configuration

**File:** `/etc/nginx/sites-available/capitance`

```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

# Backend upstream
upstream capitance_backend {
    least_conn;
    server localhost:3000;
    # Add more servers for load balancing
    # server localhost:3001;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name api.your-domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Configuration
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/capitance-access.log;
    error_log /var/log/nginx/capitance-error.log;

    # File upload size
    client_max_body_size 10M;

    # Proxy Configuration
    location /api/v1/ {
        # Rate limiting
        limit_req zone=api_limit burst=20 nodelay;

        proxy_pass http://capitance_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://capitance_backend/health;
        access_log off;
    }
}
```

### Enable Configuration

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/capitance /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Enable on startup
sudo systemctl enable nginx
```

### SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.your-domain.com

# Auto-renewal (add to crontab)
sudo crontab -e
# Add: 0 0 * * * certbot renew --quiet --post-hook "systemctl reload nginx"
```

---

## Post-Deployment

### 1. Initialize Database

```bash
# Run from back directory
node dist/scripts/initSymbolMappings.js
```

### 2. Health Checks

```bash
# Check API health
curl https://api.your-domain.com/health

# Check MongoDB connection
curl https://api.your-domain.com/api/v1/auth/me

# Check Redis
redis-cli -h localhost ping
```

### 3. Monitoring Setup

#### PM2 Monitoring (Free)

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

#### Recommended External Monitoring
- **Application:** PM2 Plus, New Relic, or DataDog
- **Server:** Prometheus + Grafana
- **Logs:** ELK Stack or Papertrail
- **Uptime:** UptimeRobot or Pingdom

### 4. Backup Configuration

```bash
# MongoDB backup script
#!/bin/bash
BACKUP_DIR="/backup/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/$DATE"
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +

# Add to crontab for daily backups
# 0 2 * * * /path/to/backup-script.sh
```

### 5. Log Rotation

**File:** `/etc/logrotate.d/capitance`

```
/opt/capitance/back/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    missingok
    create 0644 nodejs nodejs
    postrotate
        pm2 reloadLogs
    endscript
}
```

---

## Scaling Strategies

### Horizontal Scaling

1. **Load Balancer:** Use Nginx or AWS ALB
2. **Multiple Instances:** Run multiple PM2 instances or Docker containers
3. **Database:** MongoDB replica set for high availability
4. **Cache:** Redis Cluster for distributed caching

### Vertical Scaling

- Increase RAM for better caching
- Add CPU cores for PM2 cluster mode
- Use faster storage (SSD) for MongoDB and uploads

---

## Troubleshooting

### Common Issues

**502 Bad Gateway**
```bash
# Check if backend is running
pm2 list
# or
docker ps

# Check logs
pm2 logs capitance-backend
# or
docker logs capitance-backend
```

**MongoDB Connection Errors**
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check connection string in .env
cat /opt/capitance/back/.env | grep MONGODB_URI

# Test connection
mongosh "$MONGODB_URI"
```

**Redis Connection Errors**
```bash
# Check Redis status
sudo systemctl status redis

# Test connection
redis-cli -a your-redis-password ping
```

**CORS Errors**
- Verify ALLOWED_ORIGINS in .env includes your frontend domain
- Check Nginx proxy headers
- Ensure COOKIE_DOMAIN matches your domain

---

## Security Best Practices

1. **Firewall:** Only expose ports 80, 443, and 22 (SSH)
2. **SSH:** Use key-based authentication, disable password auth
3. **Updates:** Regularly update OS, Node.js, and dependencies
4. **Secrets:** Use environment variables, never commit secrets
5. **HTTPS:** Always use SSL/TLS in production
6. **Rate Limiting:** Configured by default in the application
7. **Backups:** Automated daily backups with off-site storage
8. **Monitoring:** Set up alerts for errors and downtime

---

## Rollback Procedure

```bash
# PM2 Deployment
cd /opt/capitance/back
git checkout <previous-commit-hash>
npm ci --only=production
npm run build
pm2 restart capitance-backend

# Docker Deployment
docker-compose down
git checkout <previous-commit-hash>
docker-compose up -d --build
```

---

## Support

For deployment issues, refer to:
- Application logs: `pm2 logs` or `docker logs`
- System logs: `/var/log/syslog`
- Nginx logs: `/var/log/nginx/`
- MongoDB logs: `/var/log/mongodb/mongod.log`
