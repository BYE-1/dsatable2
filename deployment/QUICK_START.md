# Quick Start Deployment Guide

## 1. Server Initial Setup (One-time)

### On your Ubuntu server:

```bash
# Install Java 21
sudo apt update
sudo apt install openjdk-21-jdk

# Run server setup script
chmod +x server-setup.sh
sudo ./server-setup.sh

# Configure Apache
sudo a2enmod proxy proxy_http rewrite
sudo systemctl restart apache2
sudo cp apache-config.conf /etc/apache2/sites-available/dsa-table.conf
sudo nano /etc/apache2/sites-available/dsa-table.conf  # Edit domain and paths
sudo a2ensite dsa-table.conf
sudo systemctl reload apache2

# Create production config
sudo mkdir -p /opt/dsa-table-backend/config
sudo mkdir -p /opt/dsa-table-backend/logs
cp application-prod.properties.example /opt/dsa-table-backend/config/application-prod.properties
nano /opt/dsa-table-backend/config/application-prod.properties  # Edit database and secrets
```

## 2. GitHub Secrets Setup

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

| Secret Name | Description | Example |
|------------|-------------|---------|
| `SERVER_HOST` | Server IP or hostname | `192.168.1.100` or `server.example.com` |
| `SERVER_USER` | SSH username | `ubuntu` or `deploy` |
| `SERVER_SSH_KEY` | Private SSH key | Full private key content |
| `SERVER_PORT` | SSH port (optional) | `22` |
| `PRODUCTION_API_URL` | Backend API URL | `https://api.yourdomain.com/api` |
| `APACHE_DOCUMENT_ROOT` | Apache doc root (optional) | `/var/www/html` |

### Generate SSH Key:

```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_deploy
ssh-copy-id -i ~/.ssh/github_deploy.pub user@your-server
cat ~/.ssh/github_deploy  # Copy this to SERVER_SSH_KEY secret
```

## 3. Deploy

### Automatic Deployment

Push to `main` branch:
- Changes in `dsa-table-backend/` → Backend deploys automatically
- Changes in `dsa-table-frontend/` → Frontend deploys automatically

### Manual Deployment

1. Go to GitHub → Actions tab
2. Select "Deploy Backend" or "Deploy Frontend"
3. Click "Run workflow"

## 4. Verify Deployment

```bash
# Check backend service
ssh user@server "sudo systemctl status dsa-table-backend"

# Check backend logs
ssh user@server "sudo journalctl -u dsa-table-backend -n 50"

# Check Apache
ssh user@server "sudo systemctl status apache2"

# Test backend API
curl http://your-server:8080/api/health

# Test frontend
curl http://your-server/
```

## Common Issues

**Backend won't start:**
- Check Java: `java -version` (should be 21)
- Check logs: `sudo journalctl -u dsa-table-backend -f`
- Verify JAR exists: `ls -lh /opt/dsa-table-backend/dsa-table-backend.jar`

**Frontend 404 errors:**
- Check Apache rewrite module: `sudo a2enmod rewrite`
- Verify files: `ls -la /var/www/html/dsa-table/`
- Check Apache config: `sudo apache2ctl configtest`

**API calls fail:**
- Verify backend is running
- Check Apache proxy configuration
- Check CORS settings in backend config

