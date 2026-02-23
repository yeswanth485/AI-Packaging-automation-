#!/bin/bash

# Railway startup script for AI Packaging Optimizer
# This script ensures proper database migration and startup sequence

set -e  # Exit on any error

echo "🚀 Starting Railway deployment..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo "Please ensure Railway has provided the DATABASE_URL"
    exit 1
fi

echo "✅ DATABASE_URL is configured"

# Run database migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

if [ $? -eq 0 ]; then
    echo "✅ Database migrations completed successfully"
else
    echo "❌ Database migrations failed"
    exit 1
fi

# Generate Prisma client (in case it's needed)
echo "🔄 Generating Prisma client..."
npx prisma generate

# Start the application
echo "🚀 Starting the application..."
exec node dist/index.js