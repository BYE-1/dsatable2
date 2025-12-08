#!/bin/bash
# Script to check backend service status and port binding

echo "=== Backend Service Status ==="
systemctl status dsa-table-backend.service --no-pager -l

echo ""
echo "=== Checking Port 8083 ==="
echo "Using netstat:"
netstat -tlnp | grep 8083 || echo "No process found on port 8083 with netstat"

echo ""
echo "Using ss (more modern):"
ss -tlnp | grep 8083 || echo "No process found on port 8083 with ss"

echo ""
echo "Using lsof:"
lsof -i :8083 2>/dev/null || echo "No process found on port 8083 with lsof"

echo ""
echo "=== Checking all listening ports ==="
echo "All TCP listening ports:"
ss -tlnp | grep LISTEN

echo ""
echo "=== Checking if process is running ==="
ps aux | grep -i "dsa-table-backend" | grep -v grep || echo "No dsa-table-backend process found"

echo ""
echo "=== Recent Application Logs ==="
if [ -f "/opt/dsa-table-backend/logs/application.log" ]; then
    echo "Last 20 lines of application.log:"
    tail -20 /opt/dsa-table-backend/logs/application.log
else
    echo "Application log file not found at /opt/dsa-table-backend/logs/application.log"
fi

echo ""
echo "=== Systemd Journal (last 30 lines) ==="
journalctl -u dsa-table-backend.service -n 30 --no-pager

echo ""
echo "=== Testing Connection ==="
echo "Testing localhost:8083..."
curl -v http://localhost:8083/api/health 2>&1 | head -20 || echo "Connection failed"

echo ""
echo "=== Checking Firewall ==="
if command -v firewall-cmd &> /dev/null; then
    echo "Firewall status:"
    firewall-cmd --list-all | grep -A 10 "ports:" || echo "No firewall rules found"
elif command -v ufw &> /dev/null; then
    echo "UFW status:"
    ufw status || echo "UFW not active"
else
    echo "No firewall command found (firewall-cmd or ufw)"
fi
