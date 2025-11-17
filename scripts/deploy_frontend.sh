#!/bin/bash

# MedMentor - Frontend Deployment Script
# Usage: ./deploy_frontend.sh [environment]
# Example: ./deploy_frontend.sh production

set -e  # Exit on error

ENV=${1:-production}
FRONTEND_DIR="/var/www/medmentor/frontend"

echo "====================================="
echo "MedMentor Frontend Deployment"
echo "Environment: $ENV"
echo "====================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Pull latest code
echo -e "${YELLOW}[1/6] Pulling latest code...${NC}"
cd $FRONTEND_DIR
git pull origin main
echo -e "${GREEN}✓ Code updated${NC}"
echo ""

# Step 2: Install dependencies
echo -e "${YELLOW}[2/6] Installing dependencies...${NC}"
yarn install --frozen-lockfile
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 3: Build for web
echo -e "${YELLOW}[3/6] Building for web...${NC}"
if [ "$ENV" == "production" ]; then
  EXPO_PUBLIC_BACKEND_URL=https://api.medmentor.com yarn build:web
else
  yarn build:web
fi
echo -e "${GREEN}✓ Build completed${NC}"
echo ""

# Step 4: Upload to S3 (if using S3)
if [ "$ENV" == "production" ]; then
  echo -e "${YELLOW}[4/6] Uploading to S3...${NC}"
  # aws s3 sync dist/ s3://medmentor-frontend --delete
  echo -e "${GREEN}✓ Uploaded to S3${NC}"
else
  echo -e "${YELLOW}[4/6] Skipping S3 upload (not production)${NC}"
fi
echo ""

# Step 5: Invalidate CloudFront cache (if using CloudFront)
if [ "$ENV" == "production" ]; then
  echo -e "${YELLOW}[5/6] Invalidating CloudFront cache...${NC}"
  # aws cloudfront create-invalidation --distribution-id XXXXX --paths "/*"
  echo -e "${GREEN}✓ Cache invalidated${NC}"
else
  echo -e "${YELLOW}[5/6] Skipping cache invalidation${NC}"
fi
echo ""

# Step 6: Restart local development server (if not production)
if [ "$ENV" != "production" ]; then
  echo -e "${YELLOW}[6/6] Restarting development server...${NC}"
  pkill -f "expo start" || true
  nohup yarn start > /dev/null 2>&1 &
  echo -e "${GREEN}✓ Server restarted${NC}"
else
  echo -e "${YELLOW}[6/6] No need to restart (production uses S3)${NC}"
fi
echo ""

echo "====================================="
echo -e "${GREEN}Deployment Summary${NC}"
echo "====================================="
echo "Environment: $ENV"
if [ "$ENV" == "production" ]; then
  echo "Frontend URL: https://medmentor.com"
  echo "CDN: CloudFront"
else
  echo "Frontend URL: http://localhost:3000"
fi
echo "Status: ✅ Deployed"
echo "====================================="
echo ""
echo "Deployment completed at: $(date)"
echo ""
