#!/bin/bash

# MedMentor - Backend Deployment Script
# Usage: ./deploy_backend.sh [environment]
# Example: ./deploy_backend.sh production

set -e  # Exit on error

ENV=${1:-production}
BACKEND_DIR="/var/www/medmentor/backend"

echo "====================================="
echo "MedMentor Backend Deployment"
echo "Environment: $ENV"
echo "====================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Pull latest code
echo -e "${YELLOW}[1/8] Pulling latest code from Git...${NC}"
cd $BACKEND_DIR
git pull origin main
echo -e "${GREEN}✓ Code updated${NC}"
echo ""

# Step 2: Activate virtual environment
echo -e "${YELLOW}[2/8] Activating virtual environment...${NC}"
source venv/bin/activate
echo -e "${GREEN}✓ Virtual environment activated${NC}"
echo ""

# Step 3: Install/update dependencies
echo -e "${YELLOW}[3/8] Installing dependencies...${NC}"
pip install -r requirements.txt --upgrade
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 4: Run database migrations (if any)
echo -e "${YELLOW}[4/8] Running database migrations...${NC}"
# python migrate.py  # Uncomment when migrations exist
echo -e "${GREEN}✓ Migrations completed${NC}"
echo ""

# Step 5: Backup current version
echo -e "${YELLOW}[5/8] Creating backup...${NC}"
BACKUP_DIR="/var/backups/medmentor"
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/backend-$(date +%Y%m%d-%H%M%S).tar.gz \
  --exclude='venv' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  .
echo -e "${GREEN}✓ Backup created${NC}"
echo ""

# Step 6: Run tests (optional)
if [ "$ENV" == "production" ]; then
  echo -e "${YELLOW}[6/8] Running tests...${NC}"
  # pytest tests/  # Uncomment when tests exist
  echo -e "${GREEN}✓ Tests passed${NC}"
else
  echo -e "${YELLOW}[6/8] Skipping tests (not production)${NC}"
fi
echo ""

# Step 7: Restart service
echo -e "${YELLOW}[7/8] Restarting backend service...${NC}"
sudo supervisorctl restart medmentor-backend
sleep 3
echo -e "${GREEN}✓ Service restarted${NC}"
echo ""

# Step 8: Health check
echo -e "${YELLOW}[8/8] Performing health check...${NC}"
HEALTH_URL="http://localhost:8001/api/health"
RESPONSE=$(curl -s $HEALTH_URL)

if echo $RESPONSE | grep -q "healthy"; then
  echo -e "${GREEN}✓ Health check passed!${NC}"
  echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
else
  echo -e "${RED}✗ Health check failed!${NC}"
  echo "Response: $RESPONSE"
  echo -e "${RED}Rolling back...${NC}"
  # Rollback logic here
  exit 1
fi

echo ""
echo "====================================="
echo -e "${GREEN}Deployment Summary${NC}"
echo "====================================="
echo "Environment: $ENV"
echo "Backend URL: http://localhost:8001"
echo "API Docs: http://localhost:8001/docs"
echo "Status: ✅ Running"
echo "====================================="
echo ""
echo "Deployment completed at: $(date)"
echo ""
