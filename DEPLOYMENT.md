# Deployment Guide

This guide explains how to deploy the DSA Table application (backend and frontend) to an Ubuntu server using GitHub Actions.

## Prerequisites

- Ubuntu server with Apache installed
- SSH access to the server
- Java 21 installed on the server
- Node.js 20+ (only needed for local builds, not on server)
- Git repository with GitHub Actions enabled

## Server Setup

### 1. Install Java 21

```bash
sudo apt update
sudo apt install openjdk-21-jdk
java -version  # Verify installation
```

### 2. Set Up Backend Service

Run the server setup script on your server:

```bash
# Copy server-setup.sh to your server
scp deployment/server-setup.sh user@your-server:/tmp/
ssh user@your-server
cd /tmp
chmod +x server-setup.sh
sudo ./server-setup.sh
```

This creates a systemd service for the Spring Boot backend that will:
- Start automatically on boot
- Restart automatically if it crashes
- Log to systemd journal

### 3. Configure Apache

1. Install required Apache modules:

```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod rewrite
sudo systemctl restart apache2
```

2. Copy the Apache configuration:

```bash
sudo cp deployment/apache-config.conf /etc/apache2/sites-available/dsa-table.conf
```

3. Edit the configuration file:

```bash
sudo nano /etc/apache2/sites-available/dsa-table.conf
```

Update:
- `ServerName` and `ServerAlias` with your domain
- Document root path if different
- Backend port if different from 8080

4. Enable the site:

```bash
sudo a2ensite dsa-table.conf
sudo systemctl reload apache2
```

### 4. Create Production Configuration

1. Create config directory:

```bash
sudo mkdir -p /opt/dsa-table-backend/config
sudo chown $USER:$USER /opt/dsa-table-backend/config
```

2. Copy and edit production properties:

```bash
cp deployment/application-prod.properties.example /opt/dsa-table-backend/config/application-prod.properties
nano /opt/dsa-table-backend/config/application-prod.properties
```

**Important:** Update:
- Database connection details
- JWT secret (generate with: `openssl rand -base64 64`)
- CORS allowed origins
- Any other environment-specific settings

3. Create logs directory:

```bash
sudo mkdir -p /opt/dsa-table-backend/logs
sudo chown $USER:$USER /opt/dsa-table-backend/logs
```

## GitHub Secrets Configuration

Configure the following secrets in your GitHub repository:

1. Go to: **Settings → Secrets and variables → Actions**

2. Add the following secrets:

   - `SERVER_HOST`: Your server's IP address or hostname
   - `SERVER_USER`: SSH username for deployment
   - `SERVER_SSH_KEY`: Private SSH key for authentication
   - `SERVER_PORT`: SSH port (default: 22, optional)
   - `PRODUCTION_API_URL`: Full URL to your backend API (e.g., `https://api.your-domain.com/api`)
   - `APACHE_DOCUMENT_ROOT`: Apache document root (default: `/var/www/html`, optional)

### Generating SSH Key

If you don't have an SSH key pair:

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy

# Copy public key to server
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub user@your-server

# Copy private key content to GitHub secret
cat ~/.ssh/github_actions_deploy
# Copy the entire output (including -----BEGIN and -----END lines) to SERVER_SSH_KEY secret
```

## Deployment Workflows

The repository includes two GitHub Actions workflows:

### Backend Deployment (`deploy-backend.yml`)

Triggers on:
- Push to `main` branch with changes in `dsa-table-backend/`
- Manual trigger via workflow_dispatch

What it does:
1. Builds the Spring Boot application with Maven
2. Packages the JAR file
3. Uploads to server
4. Restarts the systemd service

### Frontend Deployment (`deploy-frontend.yml`)

Triggers on:
- Push to `main` branch with changes in `dsa-table-frontend/`
- Manual trigger via workflow_dispatch

What it does:
1. Installs Node.js dependencies
2. Updates production API URL
3. Builds Angular application for production
4. Uploads to server
5. Extracts to Apache document root
6. Reloads Apache

## Manual Deployment

If you need to deploy manually:

### Backend

```bash
# Build
cd dsa-table-backend
mvn clean package -DskipTests

# Copy to server
scp target/dsa-table-backend-*.jar user@server:/opt/dsa-table-backend/dsa-table-backend.jar

# Restart service
ssh user@server "sudo systemctl restart dsa-table-backend"
```

### Frontend

```bash
# Build
cd dsa-table-frontend
npm ci
npm run build -- --configuration production

# Copy to server
scp -r dist/dsa-table-frontend/* user@server:/var/www/html/dsa-table/

# Set permissions
ssh user@server "sudo chown -R www-data:www-data /var/www/html/dsa-table"
```

## Monitoring

### Check Backend Status

```bash
# Service status
sudo systemctl status dsa-table-backend

# View logs
sudo journalctl -u dsa-table-backend -f

# Application logs
tail -f /opt/dsa-table-backend/logs/application.log
```

### Check Apache Status

```bash
# Apache status
sudo systemctl status apache2

# Apache error logs
sudo tail -f /var/log/apache2/dsa-table-error.log

# Apache access logs
sudo tail -f /var/log/apache2/dsa-table-access.log
```

## Troubleshooting

### Backend won't start

1. Check Java version: `java -version` (should be 21)
2. Check service logs: `sudo journalctl -u dsa-table-backend -n 50`
3. Verify JAR file exists: `ls -lh /opt/dsa-table-backend/dsa-table-backend.jar`
4. Check permissions: `ls -la /opt/dsa-table-backend/`

### Frontend not loading

1. Check Apache configuration: `sudo apache2ctl configtest`
2. Verify files exist: `ls -la /var/www/html/dsa-table/`
3. Check Apache error logs: `sudo tail -f /var/log/apache2/error.log`
4. Verify rewrite module is enabled: `sudo a2enmod rewrite`

### API calls failing

1. Check backend is running: `curl http://localhost:8080/api/health` (if you have a health endpoint)
2. Verify proxy configuration in Apache
3. Check CORS settings in backend configuration
4. Verify firewall allows connections on port 8080

## Security Considerations

1. **JWT Secret**: Use a strong, randomly generated secret in production
2. **Database**: Use a production-grade database (PostgreSQL/MySQL), not H2
3. **HTTPS**: Configure SSL/TLS certificates for production (Let's Encrypt recommended)
4. **Firewall**: Configure UFW or iptables to restrict access
5. **SSH Keys**: Use SSH keys instead of passwords
6. **Secrets**: Never commit secrets to the repository

## Database Setup

For production, you should use a proper database. Here are examples:

### PostgreSQL

```bash
sudo apt install postgresql postgresql-contrib
sudo -u postgres createdb dsatable_prod
sudo -u postgres createuser dsatable_user
sudo -u postgres psql -c "ALTER USER dsatable_user WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE dsatable_prod TO dsatable_user;"
```

Add PostgreSQL driver to `pom.xml`:

```xml
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>
```

### MySQL/MariaDB

```bash
sudo apt install mariadb-server
sudo mysql_secure_installation
sudo mysql -u root -p
```

```sql
CREATE DATABASE dsatable_prod;
CREATE USER 'dsatable_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON dsatable_prod.* TO 'dsatable_user'@'localhost';
FLUSH PRIVILEGES;
```

Add MySQL driver to `pom.xml`:

```xml
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <scope>runtime</scope>
</dependency>
```

## Next Steps

1. Set up SSL/TLS certificates (Let's Encrypt)
2. Configure automated backups
3. Set up monitoring and alerting
4. Configure log rotation
5. Set up CI/CD for testing before deployment

