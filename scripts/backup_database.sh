#!/bin/bash

# MedMentor - Database Backup Script
# Usage: ./backup_database.sh
# Recommended: Run daily via cron

set -e

echo "====================================="
echo "MedMentor Database Backup"
echo "====================================="
echo ""

# Configuration
BACKUP_DIR="/var/backups/medmentor/mongodb"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="medmentor-db-$DATE"

# MongoDB connection (update with your credentials)
MONGO_URI="mongodb://localhost:27017"
DB_NAME="medmentor_db"

# Or for MongoDB Atlas:
# MONGO_URI="mongodb+srv://user:password@cluster.mongodb.net"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Create backup directory
echo -e "${YELLOW}Creating backup directory...${NC}"
mkdir -p $BACKUP_DIR/$BACKUP_NAME
echo -e "${GREEN}✓ Directory created${NC}"
echo ""

# Backup database
echo -e "${YELLOW}Backing up database...${NC}"
mongodump \
  --uri="$MONGO_URI" \
  --db=$DB_NAME \
  --out=$BACKUP_DIR/$BACKUP_NAME \
  --gzip

echo -e "${GREEN}✓ Database backed up${NC}"
echo ""

# Create archive
echo -e "${YELLOW}Creating compressed archive...${NC}"
cd $BACKUP_DIR
tar -czf $BACKUP_NAME.tar.gz $BACKUP_NAME
rm -rf $BACKUP_NAME
echo -e "${GREEN}✓ Archive created${NC}"
echo ""

# Calculate size
SIZE=$(du -h $BACKUP_DIR/$BACKUP_NAME.tar.gz | cut -f1)
echo "Backup size: $SIZE"
echo ""

# Remove old backups
echo -e "${YELLOW}Cleaning old backups (older than $RETENTION_DAYS days)...${NC}"
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
REMAINING=$(ls -1 $BACKUP_DIR/*.tar.gz 2>/dev/null | wc -l)
echo -e "${GREEN}✓ Cleanup completed${NC}"
echo "Backups remaining: $REMAINING"
echo ""

# Upload to S3 (optional)
if command -v aws &> /dev/null; then
  echo -e "${YELLOW}Uploading to S3...${NC}"
  # aws s3 cp $BACKUP_DIR/$BACKUP_NAME.tar.gz s3://medmentor-backups/
  # echo -e "${GREEN}✓ Uploaded to S3${NC}"
  echo "S3 upload commented out - uncomment to enable"
fi
echo ""

echo "====================================="
echo -e "${GREEN}Backup Summary${NC}"
echo "====================================="
echo "Database: $DB_NAME"
echo "Backup file: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
echo "Size: $SIZE"
echo "Timestamp: $DATE"
echo "Status: ✅ Success"
echo "====================================="
echo ""
echo "Backup completed at: $(date)"
echo ""
echo "To restore this backup, run:"
echo "mongorestore --uri=\"$MONGO_URI\" --db=$DB_NAME --gzip $BACKUP_DIR/$BACKUP_NAME"
echo ""

# Log to syslog
logger -t medmentor-backup "Database backup completed: $BACKUP_NAME.tar.gz ($SIZE)"
