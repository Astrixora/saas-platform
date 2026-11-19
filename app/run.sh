#!/bin/bash
set -e
echo "🚀 Starting TigerGate Platform..."
cd "$(dirname "$0")"
pip install -r requirements.txt --quiet
echo "📦 Dependencies installed"
python server.py
