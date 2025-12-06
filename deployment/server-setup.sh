#!/bin/bash
# Server setup script for DSA Table Backend
# Run this script on your Ubuntu server to set up the Spring Boot application as a systemd service

set -e

APP_NAME="dsa-table-backend"
APP_DIR="/opt/dsa-table-backend"
SERVICE_USER="${SUDO_USER:-$USER}"
JAR_FILE="$APP_DIR/$APP_NAME.jar"

echo "Setting up $APP_NAME as a systemd service..."

# Create application directory
sudo mkdir -p $APP_DIR
sudo chown $SERVICE_USER:$SERVICE_USER $APP_DIR

# Create systemd service file
sudo tee /etc/systemd/system/$APP_NAME.service > /dev/null <<EOF
[Unit]
Description=DSA Table Backend Spring Boot Application
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/java -jar -Dspring.profiles.active=prod $JAR_FILE
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$APP_NAME

# Environment variables (uncomment and modify as needed)
# Environment="SPRING_PROFILES_ACTIVE=prod"
# Environment="JAVA_OPTS=-Xmx512m -Xms256m"

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable $APP_NAME.service

echo "Service created successfully!"
echo ""
echo "Next steps:"
echo "1. Place your JAR file at: $JAR_FILE"
echo "2. Create application-prod.properties in $APP_DIR/config/ (optional)"
echo "3. Start the service: sudo systemctl start $APP_NAME"
echo "4. Check status: sudo systemctl status $APP_NAME"
echo "5. View logs: sudo journalctl -u $APP_NAME -f"

