#!/bin/bash

echo "🚀 Building and deploying Combine Platform..."

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm ci
npm run build

# Test if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi

echo "✅ Frontend built successfully!"

# Build backend (optional - for local testing)
echo "🐍 Setting up backend..."
cd ../backend
pip install -r requirements.txt

echo "✅ Backend setup complete!"

echo "🎉 Build completed! Ready for deployment."
