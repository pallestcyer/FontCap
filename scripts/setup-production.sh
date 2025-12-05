#!/bin/bash

# FontCap Production Setup Script
# This script helps set up the production environment

set -e

echo "🚀 FontCap Production Setup"
echo "=============================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
   echo "❌ Please do not run this script as root"
   exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be 18 or higher. Current version: $(node -v)"
    exit 1
fi
echo "✅ Node.js $(node -v) detected"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL is not installed locally (may be remote)"
else
    echo "✅ PostgreSQL detected"
fi

# Check PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi
echo "✅ PM2 detected"

# Server setup
echo ""
echo "📁 Setting up server..."
cd server

if [ ! -f .env ]; then
    echo "📝 Creating server .env file..."
    cp .env.example .env

    # Generate JWT secret
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

    # Update .env with generated secret
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/CHANGE_THIS_TO_A_SECURE_RANDOM_STRING_IN_PRODUCTION/$JWT_SECRET/" .env
    else
        sed -i "s/CHANGE_THIS_TO_A_SECURE_RANDOM_STRING_IN_PRODUCTION/$JWT_SECRET/" .env
    fi

    echo "✅ Server .env created with secure JWT_SECRET"
    echo ""
    echo "⚠️  IMPORTANT: Edit server/.env and update:"
    echo "   - DATABASE_URL with your production database"
    echo "   - ALLOWED_ORIGINS with your production domain"
    echo ""
else
    echo "✅ Server .env already exists"
fi

# Install server dependencies
echo "📦 Installing server dependencies..."
npm install --production
echo "✅ Server dependencies installed"

cd ..

# Client setup
echo ""
echo "📁 Setting up client..."

if [ ! -f .env ]; then
    echo "📝 Creating client .env file..."
    cp .env.example .env
    echo "✅ Client .env created"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and update:"
    echo "   - VITE_API_URL with your production API URL"
    echo ""
else
    echo "✅ Client .env already exists"
fi

# Install client dependencies
echo "📦 Installing client dependencies..."
npm install
echo "✅ Client dependencies installed"

# Create build directory for icons if it doesn't exist
if [ ! -d "build" ]; then
    mkdir -p build
    echo "📁 Created build directory for app icons"
    echo ""
    echo "⚠️  Add your app icons to the build/ directory:"
    echo "   - build/icon.icns (macOS)"
    echo "   - build/icon.ico (Windows)"
    echo "   - build/icon.png (Linux)"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit server/.env with your production database credentials"
echo "2. Edit .env with your production API URL"
echo "3. Test the server: cd server && npm start"
echo "4. Build desktop apps: npm run build:mac (or :win, :linux)"
echo "5. Read DEPLOYMENT.md for complete deployment guide"
echo ""
echo "🚀 Happy deploying!"
