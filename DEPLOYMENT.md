# FontCap Production Deployment Guide

## Prerequisites

### Server Requirements
- Node.js 18+ installed
- PostgreSQL 14+ database
- HTTPS/SSL certificate
- Domain name
- At least 2GB RAM, 20GB storage

### Build Requirements
- For Mac builds: macOS with Xcode
- For Windows builds: Windows or macOS with wine (cross-compilation)
- Code signing certificates (for distribution)

---

## Part 1: Server Deployment

### Step 1: Set Up Production Database

1. Create a PostgreSQL database:
```bash
psql -U postgres
CREATE DATABASE fontcap_production;
CREATE USER fontcap_prod WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE fontcap_production TO fontcap_prod;
\q
```

### Step 2: Configure Server Environment

1. Navigate to server directory:
```bash
cd server
```

2. Copy the example environment file:
```bash
cp .env.example .env
```

3. Edit `.env` with production values:
```bash
# Generate a secure JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Update .env file
DATABASE_URL=postgresql://fontcap_prod:your_secure_password@localhost:5432/fontcap_production
JWT_SECRET=<paste_generated_secret_here>
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://yourdomain.com
```

### Step 3: Install Dependencies and Start Server

```bash
# Install production dependencies
npm install --production

# Start server with PM2 (recommended)
npm install -g pm2
pm2 start src/server.js --name fontcap-server
pm2 save
pm2 startup  # Follow instructions to enable auto-start
```

### Step 4: Set Up Reverse Proxy (Nginx)

Create Nginx configuration (`/etc/nginx/sites-available/fontcap`):

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # API proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # File upload size limit
        client_max_body_size 50M;
    }
}
```

Enable and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/fontcap /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Part 2: Desktop App Build & Distribution

### Step 1: Configure Build Environment

1. Create `.env` in project root:
```bash
cp .env.example .env
```

2. Update with production API URL:
```env
VITE_API_URL=https://yourdomain.com/api
VITE_NODE_ENV=production
```

### Step 2: Build Desktop Apps

#### Build for Mac
```bash
# On macOS
npm run build:mac

# Output will be in ./release/
# - FontCap-1.0.0.dmg (installer)
# - FontCap-1.0.0-mac.zip (portable)
```

#### Build for Windows
```bash
# On Windows or macOS (with wine)
npm run build:win

# Output will be in ./release/
# - FontCap Setup 1.0.0.exe (installer)
# - FontCap 1.0.0.exe (portable)
```

#### Build for Linux
```bash
npm run build:linux

# Output will be in ./release/
# - FontCap-1.0.0.AppImage
# - fontcap_1.0.0_amd64.deb
```

### Step 3: Code Signing (Recommended)

#### macOS Code Signing
1. Get Apple Developer certificate
2. Add to package.json:
```json
"build": {
  "mac": {
    "identity": "Developer ID Application: Your Name (TEAM_ID)"
  }
}
```

#### Windows Code Signing
1. Get code signing certificate (.pfx)
2. Set environment variables:
```bash
export CSC_LINK=/path/to/cert.pfx
export CSC_KEY_PASSWORD=your_password
```

---

## Part 3: Distribution

### Option 1: Direct Download
Upload installers to your website for direct download.

### Option 2: Auto-Updates
Configure electron-updater in your app for automatic updates:

1. Host update files on a server
2. Configure update server URL in electron/main.js
3. Users will get automatic update notifications

---

## Security Checklist

Before going live, ensure:

- [ ] JWT_SECRET is a strong random string (not default)
- [ ] Database has a strong password
- [ ] HTTPS/SSL is properly configured
- [ ] CORS is restricted to your domain
- [ ] File upload size limits are set
- [ ] Database backups are configured
- [ ] Server logs are monitored
- [ ] Apps are code-signed (if distributing)
- [ ] .env files are not committed to git
- [ ] Firewall rules are configured

---

## Monitoring

### Health Check
Server provides a health endpoint:
```bash
curl https://yourdomain.com/api/health
```

### Server Logs
```bash
pm2 logs fontcap-server
```

### Database Backups
```bash
# Daily backup cron job
0 2 * * * pg_dump fontcap_production > /backups/fontcap_$(date +\%Y\%m\%d).sql
```

---

## Troubleshooting

### Server won't start
1. Check logs: `pm2 logs fontcap-server`
2. Verify database connection
3. Check environment variables

### Clients can't connect
1. Verify HTTPS certificate
2. Check CORS settings
3. Verify API_URL in client .env
4. Check firewall rules

### Font uploads fail
1. Check file size limits (Nginx & Express)
2. Verify disk space
3. Check upload directory permissions

---

## Scaling Considerations

For high-traffic scenarios:

1. **Database**: Use managed PostgreSQL (AWS RDS, DigitalOcean)
2. **File Storage**: Move to S3/cloud storage instead of local filesystem
3. **Load Balancing**: Add multiple server instances behind a load balancer
4. **CDN**: Use CloudFlare or similar for static assets
5. **Caching**: Implement Redis for session/data caching

---

## Support

For issues, check:
- Server logs: `pm2 logs`
- Database logs: `/var/log/postgresql/`
- Nginx logs: `/var/log/nginx/error.log`
