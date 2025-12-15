# Legal Incident Tracker

A self-hosted "days since" counter for tracking how long you've gone without hiring another lawyer. Features a retro amber CRT terminal aesthetic.

```
╔════════════════════════════════════════════════════════════════╗
║  LEGAL INCIDENT MONITORING SYSTEM v3.2.1                       ║
╚════════════════════════════════════════════════════════════════╝
```

## Features

- **Day Counter** - Track days since your last legal representation agreement
- **Incident Log** - Full history with dates, notes, and costs
- **Money Counter** - Track lifetime legal fees (with a slowly creeping counter for emotional damage)
- **IP-Based Auth** - Lock down write operations to your IP address
- **Retro CRT Aesthetic** - Amber monochrome terminal vibes

## Quick Start

### 1. Clone/Upload to your server

```bash
# Upload the legal-tracker folder to your server
scp -r legal-tracker/ user@your-server:~/
```

### 2. Install dependencies

```bash
cd legal-tracker/backend
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
nano .env
```

Edit `.env`:
```env
PORT=3000
HOST=0.0.0.0
REQUIRE_AUTH=true
ALLOWED_IPS=YOUR.IP.ADDRESS.HERE
API_KEY=generate-a-random-key-here
```

To find your IP: https://whatismyipaddress.com/

To generate an API key:
```bash
openssl rand -hex 32
```

### 4. Run it

```bash
# Direct
npm start

# Or with PM2 (recommended for production)
npm install -g pm2
pm2 start server.js --name legal-tracker
pm2 save
pm2 startup
```

### 5. Access it

- Direct: `http://your-server-ip:3000`
- With a domain: Set up nginx reverse proxy (see below)

## Production Setup with Nginx

### Install nginx

```bash
sudo apt update
sudo apt install nginx
```

### Create site config

```bash
sudo nano /etc/nginx/sites-available/legal-tracker
```

```nginx
server {
    listen 80;
    server_name lawyerfree.lol;  # Your domain

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Enable site

```bash
sudo ln -s /etc/nginx/sites-available/legal-tracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Add SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d lawyerfree.lol
```

## API Endpoints

### Public (Read-Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/status` | Current counter status, stats, and settings |
| GET | `/api/incidents` | List all incidents |

### Protected (Requires Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/incidents` | Log a new incident |
| PUT | `/api/incidents/:id` | Update an incident |
| DELETE | `/api/incidents/:id` | Delete an incident |
| POST | `/api/settings/lifetime-spent` | Set or add to lifetime spent |
| POST | `/api/settings/last-incident-date` | Manually set last incident date |

### Example: Log an incident via API

```bash
curl -X POST http://localhost:3000/api/incidents \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"note": "Tax attorney", "cost": 2500}'
```

## Backup

The SQLite database lives at `backend/data/tracker.db`. Back it up however you like:

```bash
# Simple copy
cp backend/data/tracker.db ~/backups/tracker-$(date +%Y%m%d).db

# Or add to crontab for daily backups
0 2 * * * cp /path/to/legal-tracker/backend/data/tracker.db /path/to/backups/tracker-$(date +\%Y\%m\%d).db
```

## Customization

### Change the drain rate

Edit `frontend/app.js`:
```javascript
const DRAIN_RATE = 0.50; // $/sec
const DRAIN_ENABLED = true; // set to false to disable
```

### Add more allowed IPs

Edit `.env`:
```env
ALLOWED_IPS=123.45.67.89,98.76.54.32,111.222.333.444
```

## Troubleshooting

### "ACCESS DENIED" error
- Check your IP matches what's in `ALLOWED_IPS`
- Your IP might have changed (check https://whatismyipaddress.com/)
- If behind a proxy, make sure `X-Forwarded-For` header is being passed

### Database locked
- Make sure only one instance of the server is running
- Check file permissions on `backend/data/`

### Changes not persisting
- Check `backend/data/` directory exists and is writable
- Check server logs: `pm2 logs legal-tracker`

## License

MIT - Do whatever you want with it. Maybe use the savings on something other than lawyers.
