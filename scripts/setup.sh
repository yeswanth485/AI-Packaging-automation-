#!/bin/bash

echo "🚀 Setting up AI Packaging Optimizer..."

# Check if .env exists
if [ ! -f .env ]; then
  echo "📝 Creating .env file from .env.example..."
  cp .env.example .env
  echo "✅ .env file created. Please update with your configuration."
else
  echo "✅ .env file already exists"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose up -d postgres redis

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run prisma:generate

# Run migrations
echo "🗄️  Running database migrations..."
npm run prisma:migrate

echo ""
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Update .env with your configuration"
echo "  2. Run 'npm run dev' to start the development server"
echo "  3. Run 'npm test' to run tests"
echo ""
