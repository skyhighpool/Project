# Waste Management Reward System - Indian Edition

A comprehensive video submission and reward system for waste management with Indian payment gateway integration. Users can upload videos of waste disposal, earn points, and cash out through popular Indian payment methods like UPI, Razorpay, Paytm, and PhonePe.

## 🚀 Features

### For Tourists/Citizens
- **Video Upload**: Submit videos of waste disposal with GPS validation
- **Auto-Verification**: AI-powered scoring system for instant approval
- **Points System**: Earn points for approved submissions (1 point = ₹0.10)
- **Multiple Payment Methods**: Cash out via UPI, Razorpay, Paytm, PhonePe, or bank transfer
- **Real-time Status**: Track submission and payout status
- **Notifications**: Email/SMS alerts for decisions and payouts

### For Moderators
- **Review Queue**: Efficient video review interface with metadata
- **Fraud Detection**: Duplicate video detection, GPS validation, rate limiting
- **Audit Trail**: Complete action logging for transparency
- **Bulk Operations**: Approve/reject multiple submissions

### For Finance Team
- **Payout Management**: Process cashout requests through payment gateways
- **Transaction Tracking**: Monitor payment status and webhook handling
- **Reconciliation**: Automated payment verification and reporting

### For City Council
- **Analytics Dashboard**: Participation metrics, geographic heatmaps
- **Financial Reports**: Payout totals, cost per kg/item analysis
- **Export Capabilities**: CSV exports and scheduled reports
- **Zone-wise Insights**: Performance by geographic areas

## 🏗️ Architecture

- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS
- **Backend**: Next.js API routes with Prisma ORM
- **Database**: PostgreSQL with row-level security
- **Storage**: AWS S3 for video and thumbnail storage
- **Queue**: Redis + BullMQ for background processing
- **Payments**: Razorpay, Paytm, PhonePe, UPI integration
- **Auth**: NextAuth.js with JWT
- **Maps**: OpenStreetMap for bin locations

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- Redis 6+
- AWS S3 bucket
- Indian payment gateway accounts (Razorpay, Paytm, PhonePe)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd waste-management-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following in `.env.local`:
   - Database connection
   - Redis connection
   - AWS S3 credentials
   - Payment gateway credentials
   - Email/SMS settings

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Run migrations
   npm run db:migrate
   
   # Seed initial data
   npm run db:seed
   ```

5. **Start Redis server**
   ```bash
   # On macOS with Homebrew
   brew install redis
   brew services start redis
   
   # On Ubuntu
   sudo apt-get install redis-server
   sudo systemctl start redis
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### Payment Gateway Setup

#### Razorpay
1. Create account at [razorpay.com](https://razorpay.com)
2. Get API keys from dashboard
3. Configure webhook endpoint: `https://yourdomain.com/api/webhooks/razorpay`

#### Paytm
1. Register at [paytm.com/business](https://paytm.com/business)
2. Complete KYC and get merchant credentials
3. Set up webhook for payout status

#### PhonePe
1. Sign up at [phonepe.com/business](https://phonepe.com/business)
2. Get merchant ID and salt keys
3. Configure callback URLs

### AWS S3 Setup
1. Create S3 bucket in `ap-south-1` region
2. Configure CORS policy for video uploads
3. Set up IAM user with S3 permissions

### Database Setup
1. Create PostgreSQL database
2. Configure connection string
3. Run migrations to create tables

## 📊 Database Schema

### Core Tables
- `users` - User accounts with roles
- `user_wallets` - Points and cash balances
- `bin_locations` - Waste bin coordinates and radius
- `video_submissions` - Video metadata and status
- `submission_events` - Audit trail for all actions
- `cashout_requests` - Payout requests
- `payout_transactions` - Payment gateway transactions

### Key Relationships
- Users have wallets and submissions
- Submissions are linked to bin locations
- Cashouts create payout transactions
- All actions are logged in events table

## 🔐 Security Features

- **Row-level security** in PostgreSQL
- **JWT authentication** with refresh tokens
- **Role-based access control** (Tourist, Moderator, Finance, Council)
- **Webhook signature verification** for payment gateways
- **Rate limiting** on API endpoints
- **Input validation** with Zod schemas
- **Audit logging** for all admin actions

## 🚀 Deployment

### Production Setup

1. **Environment Variables**
   ```bash
   # Set production environment variables
   NODE_ENV=production
   DATABASE_URL="postgresql://..."
   REDIS_URL="redis://..."
   ```

2. **Database Migration**
   ```bash
   npm run db:migrate:deploy
   ```

3. **Build Application**
   ```bash
   npm run build
   npm start
   ```

### Docker Deployment
```bash
# Build image
docker build -t waste-management-system .

# Run container
docker run -p 3000:3000 waste-management-system
```

### Vercel Deployment
1. Connect GitHub repository to Vercel
2. Configure environment variables
3. Deploy automatically on push to main branch

## 📱 API Endpoints

### Public APIs (Auth Required)
- `POST /api/auth/signin` - User login
- `GET /api/me` - User profile and wallet
- `POST /api/submissions` - Create video submission
- `GET /api/submissions` - List user submissions
- `POST /api/cashouts` - Request cashout
- `GET /api/cashouts` - List cashout history

### Admin APIs
- `GET /api/admin/submissions` - Moderation queue
- `POST /api/admin/submissions` - Approve/reject submissions
- `GET /api/admin/cashouts` - Finance dashboard
- `POST /api/admin/cashouts` - Process payouts
- `GET /api/admin/reports` - Council analytics

### Webhooks
- `POST /api/webhooks/razorpay` - Razorpay status updates
- `POST /api/webhooks/paytm` - Paytm status updates
- `POST /api/webhooks/phonepe` - PhonePe status updates

## 🎯 Auto-Verification Scoring

The system uses a weighted scoring algorithm:

- **GPS Validation (40%)**: Distance from nearest bin
- **Duration Check (20%)**: Video length validation
- **File Size (15%)**: File size limits
- **Duplicate Detection (15%)**: Perceptual hash matching
- **Time Validation (10%)**: Recording time vs upload time

**Thresholds:**
- ≥80 points: Auto-approved
- 50-79 points: Human review required
- <50 points: Auto-rejected

## 💰 Payment Processing

### Supported Methods
1. **UPI**: Direct bank transfers via UPI ID
2. **Razorpay**: UPI, cards, net banking
3. **Paytm**: Wallet and UPI
4. **PhonePe**: UPI and wallet
5. **Bank Transfer**: Direct NEFT/IMPS

### Processing Flow
1. User requests cashout
2. Points locked in wallet
3. Payment gateway processes payout
4. Webhook confirms status
5. Points debited on success
6. Refund on failure

## 📈 Monitoring & Analytics

### Metrics Tracked
- Daily submission counts
- Approval rates by zone
- Payment success rates
- User engagement metrics
- Geographic participation heatmaps

### Reporting
- Real-time dashboards
- Scheduled email reports
- CSV exports
- API endpoints for external tools

## 🔧 Development

### Code Structure
```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # User dashboard
│   └── admin/             # Admin interfaces
├── components/            # Reusable React components
├── lib/                   # Utility libraries
├── prisma/                # Database schema and migrations
└── types/                 # TypeScript type definitions
```

### Key Libraries
- **Prisma**: Database ORM
- **NextAuth**: Authentication
- **BullMQ**: Job queues
- **Zod**: Schema validation
- **Tailwind**: Styling
- **Recharts**: Data visualization

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Contact: support@wastemanagement.com
- Documentation: [docs.wastemanagement.com](https://docs.wastemanagement.com)

## 🔄 Roadmap

### Phase 2 (Q2 2024)
- Mobile app development
- ML-powered waste classification
- Advanced fraud detection
- Multi-language support

### Phase 3 (Q3 2024)
- IoT integration for smart bins
- Blockchain for transparency
- Advanced analytics
- Partner integrations

---

**Built with ❤️ for a cleaner India**