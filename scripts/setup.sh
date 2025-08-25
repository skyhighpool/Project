#!/bin/bash

# Waste Management System Setup Script
# This script automates the setup process for the Indian waste management reward system

set -e

echo "🚀 Setting up Waste Management Reward System - Indian Edition"
echo "=============================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running on supported OS
check_os() {
    print_status "Checking operating system..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        print_success "Linux detected"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        print_success "macOS detected"
    else
        print_error "Unsupported operating system: $OSTYPE"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node -v)"
        exit 1
    fi
    print_success "Node.js $(node -v) is installed"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    print_success "npm $(npm -v) is installed"
    
    # Check Git
    if ! command -v git &> /dev/null; then
        print_warning "Git is not installed. Some features may not work properly."
    else
        print_success "Git $(git --version) is installed"
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing Node.js dependencies..."
    
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    print_success "Dependencies installed successfully"
}

# Setup environment file
setup_environment() {
    print_status "Setting up environment configuration..."
    
    if [ ! -f ".env.local" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env.local
            print_success "Created .env.local from .env.example"
            print_warning "Please edit .env.local with your actual configuration values"
        else
            print_error ".env.example not found"
            exit 1
        fi
    else
        print_warning ".env.local already exists. Skipping environment setup."
    fi
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    # Check if DATABASE_URL is set
    if [ -f ".env.local" ]; then
        if grep -q "DATABASE_URL" .env.local; then
            print_status "Database URL found in .env.local"
        else
            print_warning "DATABASE_URL not found in .env.local. Please configure it manually."
        fi
    fi
    
    # Generate Prisma client
    print_status "Generating Prisma client..."
    npm run db:generate
    
    # Run migrations
    print_status "Running database migrations..."
    npm run db:migrate
    
    print_success "Database setup completed"
}

# Setup Redis
setup_redis() {
    print_status "Setting up Redis..."
    
    if command -v redis-server &> /dev/null; then
        print_success "Redis is already installed"
    else
        print_status "Installing Redis..."
        
        if [ "$OS" = "macos" ]; then
            if command -v brew &> /dev/null; then
                brew install redis
                brew services start redis
                print_success "Redis installed and started via Homebrew"
            else
                print_error "Homebrew not found. Please install Redis manually."
                print_status "Visit: https://redis.io/download"
            fi
        elif [ "$OS" = "linux" ]; then
            if command -v apt-get &> /dev/null; then
                sudo apt-get update
                sudo apt-get install -y redis-server
                sudo systemctl start redis-server
                sudo systemctl enable redis-server
                print_success "Redis installed and started via apt"
            elif command -v yum &> /dev/null; then
                sudo yum install -y redis
                sudo systemctl start redis
                sudo systemctl enable redis
                print_success "Redis installed and started via yum"
            else
                print_error "Package manager not found. Please install Redis manually."
                print_status "Visit: https://redis.io/download"
            fi
        fi
    fi
}

# Seed database
seed_database() {
    print_status "Seeding database with sample data..."
    
    read -p "Do you want to seed the database with sample data? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm run db:seed
        print_success "Database seeded successfully"
    else
        print_status "Skipping database seeding"
    fi
}

# Setup payment gateways
setup_payment_gateways() {
    print_status "Setting up payment gateway configurations..."
    
    echo
    echo "📋 Payment Gateway Setup Instructions:"
    echo "======================================"
    echo
    echo "1. RAZORPAY:"
    echo "   - Visit: https://razorpay.com"
    echo "   - Create account and get API keys"
    echo "   - Add to .env.local:"
    echo "     RAZORPAY_KEY_ID=rzp_test_your_key_id"
    echo "     RAZORPAY_KEY_SECRET=your_key_secret"
    echo "     RAZORPAY_WEBHOOK_SECRET=your_webhook_secret"
    echo
    echo "2. PAYTM:"
    echo "   - Visit: https://paytm.com/business"
    echo "   - Register and complete KYC"
    echo "   - Add to .env.local:"
    echo "     PAYTM_MERCHANT_ID=your_merchant_id"
    echo "     PAYTM_MERCHANT_KEY=your_merchant_key"
    echo "     PAYTM_ENVIRONMENT=TEST"
    echo
    echo "3. PHONEPE:"
    echo "   - Visit: https://phonepe.com/business"
    echo "   - Sign up and get credentials"
    echo "   - Add to .env.local:"
    echo "     PHONEPE_MERCHANT_ID=your_merchant_id"
    echo "     PHONEPE_SALT_KEY=your_salt_key"
    echo "     PHONEPE_SALT_INDEX=1"
    echo "     PHONEPE_ENVIRONMENT=UAT"
    echo
    print_warning "Please configure payment gateway credentials in .env.local before running the application"
}

# Setup AWS S3
setup_aws_s3() {
    print_status "Setting up AWS S3 configuration..."
    
    echo
    echo "📦 AWS S3 Setup Instructions:"
    echo "============================="
    echo
    echo "1. Create AWS account at https://aws.amazon.com"
    echo "2. Create S3 bucket in ap-south-1 region"
    echo "3. Configure CORS policy for video uploads:"
    echo "   ["
    echo "     {"
    echo "       \"AllowedHeaders\": [\"*\"],"
    echo "       \"AllowedMethods\": [\"GET\", \"POST\", \"PUT\", \"DELETE\"],"
    echo "       \"AllowedOrigins\": [\"http://localhost:3000\", \"https://yourdomain.com\"],"
    echo "       \"ExposeHeaders\": []"
    echo "     }"
    echo "   ]"
    echo "4. Create IAM user with S3 permissions"
    echo "5. Add to .env.local:"
    echo "   AWS_ACCESS_KEY_ID=your_access_key"
    echo "   AWS_SECRET_ACCESS_KEY=your_secret_key"
    echo "   AWS_REGION=ap-south-1"
    echo "   AWS_S3_BUCKET=your-bucket-name"
    echo
}

# Build application
build_application() {
    print_status "Building application..."
    
    npm run build
    
    print_success "Application built successfully"
}

# Display next steps
display_next_steps() {
    echo
    echo "🎉 Setup completed successfully!"
    echo "================================"
    echo
    echo "📋 Next Steps:"
    echo "1. Edit .env.local with your actual configuration values"
    echo "2. Configure payment gateway credentials"
    echo "3. Set up AWS S3 bucket and credentials"
    echo "4. Start the development server:"
    echo "   npm run dev"
    echo
    echo "🔑 Sample Login Credentials:"
    echo "Tourist: tourist1@example.com / password123"
    echo "Moderator: moderator@example.com / password123"
    echo "Finance: finance@example.com / password123"
    echo "Council: council@example.com / password123"
    echo
    echo "📚 Documentation:"
    echo "- README.md for detailed setup instructions"
    echo "- API documentation in the codebase"
    echo
    echo "🚀 Happy coding!"
}

# Main setup function
main() {
    check_os
    check_prerequisites
    install_dependencies
    setup_environment
    setup_database
    setup_redis
    seed_database
    setup_payment_gateways
    setup_aws_s3
    build_application
    display_next_steps
}

# Run main function
main "$@"