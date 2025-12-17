#!/bin/bash

# Helper script to start the Super Admin Portal Backend

echo ""
echo "========================================"
echo "  Super Admin Portal - Backend Server"
echo "========================================"
echo ""

# Check if port 5000 is in use
echo "[1/3] Checking port 5000..."
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "WARNING: Port 5000 is already in use!"
    echo "Killing process on port 5000..."
    kill -9 $(lsof -t -i:5000) 2>/dev/null
    sleep 2
    echo "Port 5000 is now available."
else
    echo "Port 5000 is available."
fi

echo ""
echo "[2/3] Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
else
    echo "Dependencies already installed."
fi

echo ""
echo "[3/3] Starting server..."
echo ""
echo "========================================"
echo "  Server starting in development mode"
echo "  Press Ctrl+C to stop"
echo "========================================"
echo ""

npm run dev
