#!/bin/bash
# Build frontend and copy into backend/static for single-process deployment
set -e

echo "→ Installing frontend dependencies..."
cd frontend && npm install

echo "→ Building frontend..."
npm run build

echo "→ Frontend built to backend/static/"
cd ..

echo "→ Installing backend dependencies..."
pip install -r backend/requirements.txt

echo ""
echo "✓ Build complete!"
echo ""
echo "Run the app:"
echo "  cd backend && uvicorn main:app --host 0.0.0.0 --port 8000"
