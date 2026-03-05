#!/bin/bash
# =============================================================
# MedMentor Frontend Auto-Repair Script
# Runs before Expo to ensure all dependencies are healthy
# Solves pod hibernation corruption issues
# =============================================================

cd /app/frontend

log() { echo "[AUTOREPAIR] $(date '+%H:%M:%S') $1"; }

NEEDS_INSTALL=false
NEEDS_DEDUP=false

# Check 1: Critical packages exist on disk
for pkg in expo-router react-native-reanimated react-native-worklets @react-navigation/native react-native-paper; do
    if [ ! -f "node_modules/$pkg/package.json" ]; then
        log "Missing: $pkg"
        NEEDS_INSTALL=true
    fi
done

# Check 2: Nested duplicate @react-navigation/native (causes crash)
NESTED_DUPES=$(find node_modules -mindepth 4 -path "*/node_modules/@react-navigation/native/package.json" 2>/dev/null | wc -l)
if [ "$NESTED_DUPES" -gt 0 ]; then
    log "Found $NESTED_DUPES nested @react-navigation duplicates"
    NEEDS_DEDUP=true
fi

# Repair if needed
if [ "$NEEDS_INSTALL" = true ]; then
    log "Reinstalling dependencies (yarn install --force)..."
    yarn install --force --network-timeout 120000 2>&1 | tail -3
    NEEDS_DEDUP=true
fi

if [ "$NEEDS_DEDUP" = true ]; then
    log "Cleaning nested @react-navigation duplicates..."
    find node_modules -mindepth 4 -path "*/node_modules/@react-navigation" -type d | while read d; do
        if [ -d "$d/native" ]; then
            log "  Removed: $d"
            rm -rf "$d"
        fi
    done
    rm -rf .metro-cache
    log "Repair complete"
fi

if [ "$NEEDS_INSTALL" = false ] && [ "$NEEDS_DEDUP" = false ]; then
    log "All healthy"
fi

exec yarn expo start --web --port 3000
