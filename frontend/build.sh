#!/bin/bash

# Build script for Render deployment
echo "🚀 Starting Render build..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build the application
echo "🔨 Building application..."
npm run build

# Install serve globally for production
echo "📡 Installing serve..."
npm install -g serve

echo "✅ Build completed successfully!"
