# 🚀 mvp_PRO — Production Deployment Guide

This guide details how to deploy **mvp_PRO** to an **AWS EC2 instance** or **DigitalOcean Droplet (Ubuntu 22.04 / 24.04 LTS)** using Node.js, PM2 process manager, and Nginx reverse proxy with automated SSL.

---

## 🏗️ Architecture Overview

```
[ Browser / Client ]
         │ (HTTPS / port 443)
         ▼
[ Nginx Reverse Proxy + SSL Certbot ]
         │ (HTTP / port 3000)
         ▼
[ Node.js + PM2 (Next.js Standup AI Server) ]
         │
   ┌─────┴────────────────────────┬──────────────────────┐
   ▼                              ▼                      ▼
[ Supabase PostgreSQL ]    [ Groq Whisper/Mixtral ]    [ Resend SMTP / AWS S3 ]
```

---

## 📋 Step 1: Server Provisioning (EC2 or DigitalOcean)

1. Provision an **Ubuntu 22.04 LTS** instance (Recommended: 2 vCPU, 2GB–4GB RAM).
2. Configure Security Group / Firewall rules:
   - **SSH:** Port 22 (Your IP)
   - **HTTP:** Port 80 (Anywhere 0.0.0.0/0)
   - **HTTPS:** Port 443 (Anywhere 0.0.0.0/0)
3. SSH into the server:
   ```bash
   ssh -i your-key.pem ubuntu@your-server-ip
   ```

---

## 📦 Step 2: System Packages & Node.js Installation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git build-essential nginx certbot python3-certbot-nginx

# Install PM2 globally
sudo npm install -g pm2
```

---

## 📥 Step 3: Clone Codebase & Configure Environment

```bash
# Create application directory
sudo mkdir -p /var/www/standup-ai
sudo chown -R $USER:$USER /var/www/standup-ai

# Clone repository
git clone https://github.com/your-org/standup-ai.git /var/www/standup-ai
cd /var/www/standup-ai

# Install production dependencies
npm install

# Create production environment file
cp .env.example .env.local
nano .env.local
```

### Populate Production Environment Variables:
```env
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-secure-random-32-character-secret-key-here
GROQ_API_KEY=gsk_your_groq_api_key
RESEND_API_KEY=re_your_resend_key
DIGEST_EMAIL_FROM=standup@yourdomain.com
DIGEST_RECIPIENT_EMAIL=team@yourdomain.com
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_S3_BUCKET_NAME=your-s3-bucket
```

---

## 🔨 Step 4: Build Application & Start PM2 Daemon

```bash
# Build Next.js optimized production bundle
npm run build

# Start with PM2
pm2 start npm --name "standup-ai" -- start

# Configure PM2 to start automatically on system reboot
pm2 startup
pm2 save
```

---

## 🌐 Step 5: Configure Nginx Reverse Proxy

Create `/etc/nginx/sites-available/standup-ai`:
```bash
sudo nano /etc/nginx/sites-available/standup-ai
```

Paste the following Nginx configuration (replace `standup.yourdomain.com` with your actual domain):
```nginx
server {
    listen 80;
    server_name standup.yourdomain.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/standup-ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔒 Step 6: Enable Free SSL with Certbot (HTTPS)

```bash
sudo certbot --nginx -d standup.yourdomain.com
```
Certbot will configure SSL certificates and auto-renewal cron tasks automatically.

---

## ⏰ Step 7: Setup Automated Daily Digest Cron

To trigger the automated daily digest email every night at 00:00 UTC, add a crontab entry:
```bash
crontab -e
```
Add line:
```cron
0 0 * * * curl -s -X POST https://standup.yourdomain.com/api/cron/digest > /dev/null 2>&1
```

---

## ✅ Deployment Verification Checklist

- [ ] Visit `https://standup.yourdomain.com/login` and test authentication.
- [ ] Record a 30s audio standup and verify instant Groq Whisper transcription.
- [ ] Verify summary appears on dashboard and saves in Supabase PostgreSQL.
- [ ] Send test digest email from `/digest`.
- [ ] Check logs: `pm2 logs standup-ai`.
