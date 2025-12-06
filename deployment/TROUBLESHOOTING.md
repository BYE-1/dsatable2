# Troubleshooting Deployment Issues

## Common GitHub Actions Errors

### "sudo: a password is required"

**Error Message:**
```
err: sudo: a terminal is required to read the password
err: sudo: a password is required
```

**Cause:** The SSH user doesn't have passwordless sudo configured.

**Solution:**

1. **On your server**, configure passwordless sudo:

```bash
# Option 1: Use the provided script (recommended)
chmod +x configure-passwordless-sudo.sh
sudo ./configure-passwordless-sudo.sh

# Option 2: Manual configuration
sudo visudo -f /etc/sudoers.d/dsa-table-deploy
```

Add these lines (replace `your-user` with your deployment user):
```
your-user ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart dsa-table-backend.service
your-user ALL=(ALL) NOPASSWD: /usr/bin/systemctl status dsa-table-backend.service
your-user ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload apache2
your-user ALL=(ALL) NOPASSWD: /bin/mkdir -p /opt/dsa-table-backend
your-user ALL=(ALL) NOPASSWD: /bin/cp /tmp/dsa-table-backend-deploy/* /opt/dsa-table-backend/*
your-user ALL=(ALL) NOPASSWD: /bin/chown * /opt/dsa-table-backend/*
your-user ALL=(ALL) NOPASSWD: /bin/mv /var/www/html/dsa-table* /var/www/html/dsa-table*
your-user ALL=(ALL) NOPASSWD: /bin/mkdir -p /var/www/html/dsa-table
your-user ALL=(ALL) NOPASSWD: /bin/tar -xzf /tmp/frontend-deploy.tar.gz -C /var/www/html/dsa-table
your-user ALL=(ALL) NOPASSWD: /bin/chown -R www-data:www-data /var/www/html/dsa-table
```

2. **Verify** passwordless sudo works:
```bash
sudo -n true
# Should return without error
```

3. **Test** the deployment again from GitHub Actions.

### "Service not found, you may need to create it"

**Error Message:**
```
Service not found, you may need to create it
```

**Cause:** The systemd service hasn't been created yet.

**Solution:**

Run the server setup script on your server:
```bash
chmod +x server-setup.sh
sudo ./server-setup.sh
```

This creates the systemd service file at `/etc/systemd/system/dsa-table-backend.service`.

### "Permission denied" errors

**Error Message:**
```
Permission denied
```

**Cause:** The deployment user doesn't have permission to access directories or files.

**Solution:**

1. **For backend directory:**
```bash
sudo mkdir -p /opt/dsa-table-backend
sudo chown -R your-user:your-user /opt/dsa-table-backend
```

2. **For frontend directory:**
```bash
sudo mkdir -p /var/www/html/dsa-table
sudo chown -R your-user:your-user /var/www/html/dsa-table
# After deployment, change ownership back to www-data
sudo chown -R www-data:www-data /var/www/html/dsa-table
```

### SSH Connection Failed

**Error Message:**
```
Error: dial tcp: connect: connection refused
```

**Cause:** SSH connection to server failed.

**Solutions:**

1. **Check SSH key in GitHub secrets:**
   - Go to Settings → Secrets → SERVER_SSH_KEY
   - Ensure the private key is complete (includes `-----BEGIN` and `-----END` lines)
   - Ensure there are no extra spaces or line breaks

2. **Verify server is accessible:**
   ```bash
   ssh -i ~/.ssh/your-key user@your-server
   ```

3. **Check firewall:**
   ```bash
   # On server
   sudo ufw status
   # Ensure SSH port (22) is open
   ```

4. **Verify SSH service is running:**
   ```bash
   # On server
   sudo systemctl status ssh
   ```

### Build Failures

#### Backend: Maven build fails

**Check:**
- Java version (should be 21)
- Maven dependencies are accessible
- Check GitHub Actions logs for specific error

#### Frontend: npm build fails

**Check:**
- Node.js version (should be 20)
- package-lock.json is up to date
- Check GitHub Actions logs for specific error

### Deployment Succeeds but Application Doesn't Work

#### Backend not responding

1. **Check if service is running:**
   ```bash
   sudo systemctl status dsa-table-backend
   ```

2. **Check logs:**
   ```bash
   sudo journalctl -u dsa-table-backend -n 100
   ```

3. **Check if port is listening:**
   ```bash
   sudo netstat -tlnp | grep 8080
   # or
   sudo ss -tlnp | grep 8080
   ```

4. **Check firewall:**
   ```bash
   sudo ufw status
   # Ensure port 8080 is open (if needed)
   ```

#### Frontend shows 404 or blank page

1. **Check Apache is running:**
   ```bash
   sudo systemctl status apache2
   ```

2. **Check files exist:**
   ```bash
   ls -la /var/www/html/dsa-table/
   ```

3. **Check Apache error logs:**
   ```bash
   sudo tail -f /var/log/apache2/error.log
   ```

4. **Check Apache configuration:**
   ```bash
   sudo apache2ctl configtest
   ```

5. **Verify rewrite module is enabled:**
   ```bash
   sudo a2enmod rewrite
   sudo systemctl reload apache2
   ```

#### API calls fail (CORS errors)

1. **Check backend CORS configuration** in `application-prod.properties`:
   ```properties
   spring.web.cors.allowed-origins=https://your-domain.com
   ```

2. **Check Apache proxy configuration** - ensure `/api` is proxied correctly

3. **Check browser console** for specific error messages

## Manual Deployment (If GitHub Actions Fails)

### Backend

```bash
# Build locally
cd dsa-table-backend
mvn clean package -DskipTests

# Copy to server
scp target/dsa-table-backend-*.jar user@server:/tmp/

# On server
ssh user@server
sudo cp /tmp/dsa-table-backend-*.jar /opt/dsa-table-backend/dsa-table-backend.jar
sudo systemctl restart dsa-table-backend
```

### Frontend

```bash
# Build locally
cd dsa-table-frontend
npm ci
npm run build -- --configuration production

# Copy to server
scp -r dist/dsa-table-frontend/* user@server:/tmp/dsa-table/

# On server
ssh user@server
sudo rm -rf /var/www/html/dsa-table
sudo cp -r /tmp/dsa-table /var/www/html/dsa-table
sudo chown -R www-data:www-data /var/www/html/dsa-table
sudo systemctl reload apache2
```

## Getting Help

If you're still having issues:

1. Check the full GitHub Actions logs for detailed error messages
2. Check server logs: `sudo journalctl -u dsa-table-backend -f`
3. Verify all prerequisites are installed
4. Ensure all GitHub secrets are configured correctly
5. Test SSH connection manually from your local machine

