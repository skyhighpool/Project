#!/bin/bash

# Waste Management System Setup Script
# This script helps you set up the complete waste management video submission system

set -e

echo "🌱 Waste Management System Setup"
echo "================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL 14+ first."
    exit 1
fi

# Check if Redis is installed
if ! command -v redis-server &> /dev/null; then
    echo "❌ Redis is not installed. Please install Redis 6+ first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration before continuing"
    echo "   Key variables to configure:"
    echo "   - DATABASE_URL: PostgreSQL connection string"
    echo "   - JWT_SECRET: Random string for JWT signing"
    echo "   - AWS credentials (if using S3)"
    echo "   - Stripe keys (if using payments)"
    read -p "Press Enter after configuring .env file..."
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run db:generate

# Run database migrations
echo "🗄️  Running database migrations..."
npm run db:migrate

# Seed database with sample data
echo "🌱 Seeding database with sample data..."
npm run db:seed

# Build the application
echo "🏗️  Building the application..."
npm run build

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Start the development server: npm run dev"
echo "2. Open http://localhost:3000 in your browser"
echo "3. Create test accounts with different roles:"
echo "   - Tourist: Regular user for video submissions"
echo "   - Moderator: Review and approve submissions"
echo "   - Council: View analytics and reports"
echo "   - Finance: Manage payouts and transactions"
echo ""
echo "Default test credentials (from seed data):"
echo "- Tourist: tourist@example.com (no password required in demo)"
echo "- Moderator: moderator@example.com"
echo "- Council: council@example.com"
echo "- Finance: finance@example.com"
echo ""
echo "For production deployment:"
echo "1. Set NODE_ENV=production"
echo "2. Configure production database and Redis"
echo "3. Set up proper SSL certificates"
echo "4. Configure CDN for video delivery"
echo "5. Set up monitoring and logging"
echo ""
echo "Happy coding! 🌱♻️"