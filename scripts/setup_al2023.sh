#!/bin/bash

# SilentShield Auto-Setup for Amazon Linux 2023
echo "🚀 Starting SilentShield environment setup..."

# 1. Update and Install System Dependencies
sudo dnf update -y
sudo dnf install -y nodejs python3-pip python3-devel redis6 git

# 2. Start and Enable Redis
sudo systemctl enable --now redis6
echo "✅ Redis started."

# 3. Global Node Tools (PM2)
sudo npm install -g pm2
echo "✅ PM2 installed."

# 4. Prepare Folders
mkdir -p ~/silentshield
cd ~/silentshield

echo "------------------------------------------------"
echo "✅ Environment Ready!"
echo "Next steps:"
echo "1. Clone your repo: git clone <your-repo-url> ."
echo "2. Setup Backend: cd backend && npm install"
echo "3. Setup ML: cd ../predict && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
echo "4. Start Services: pm2 start ~/silentshield/backend/riskengine.js --name 'silent-backend'"
echo "5. Start ML: pm2 start 'python3 ~/silentshield/predict/app.py' --name 'silent-ml'"
echo "------------------------------------------------"
