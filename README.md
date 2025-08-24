# Waste Management Video Submission Platform - MVP

A comprehensive platform for managing video submissions of proper waste disposal, with role-based access control, automated validation, and financial rewards.

## 🎯 MVP Features

### Tourist Role
- ✅ **Authentication**: Sign up/login with email and social login support
- ✅ **Profile & Wallet**: View balance and manage account
- ✅ **Video Upload**: Submit videos with auto-metadata capture (GPS, timestamp, duration, device hash)
- ✅ **Submission Tracking**: Monitor status from Queued → Auto-Verified → Human-Review → Approved/Rejected
- ✅ **Cash-out System**: Convert points to cash via multiple payment methods
- ✅ **Notifications**: Real-time updates on submission decisions and payouts

### Moderator Admin Role
- ✅ **Review Queue**: Comprehensive video review interface with video player, map, and metadata
- ✅ **Decision Management**: Approve/reject submissions with reason tracking
- ✅ **Fraud Detection Tools**: 
  - Duplicate video hash matching
  - GPS radius validation vs bin locations
  - Rate limiting enforcement
  - User flagging system
- ✅ **Audit Trail**: Complete log of all moderation actions

### Finance Role
- ✅ **Payout Management**: Process approved cash-out requests
- ✅ **Transaction Tracking**: Monitor payout statuses (Initiated → Success/Failed/Needs-Info)
- ✅ **Reconciliation Tools**: Handle payment gateway webhooks and resolve discrepancies
- ✅ **Financial Reporting**: Export transaction data and generate reports

### Council Role
- ✅ **Read-only Dashboards**: Monitor program effectiveness
- ✅ **Participation Metrics**: Track user engagement by area and time
- ✅ **Submission Analytics**: Quality metrics and geographic distribution
- ✅ **Payout Reports**: Financial summaries and cost analysis
- ✅ **Data Export**: CSV downloads and scheduled reporting

## 🏗️ System Architecture

### Frontend
- **Framework**: Next.js 14 with React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React hooks with local storage
- **Charts**: Recharts for data visualization
- **Maps**: Leaflet for interactive mapping

### Backend
- **Runtime**: Node.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with refresh tokens
- **File Storage**: AWS S3 integration
- **Video Processing**: FFmpeg for transcoding and thumbnails
- **Queue System**: BullMQ for background job processing
- **Caching**: Redis for session and data caching

### Key Technologies
- **Video Processing**: FFmpeg for metadata extraction and thumbnail generation
- **Geolocation**: GPS validation and bin location proximity checking
- **Fraud Detection**: Perceptual hashing for duplicate detection
- **Payment Integration**: Stripe/PayPal payout APIs
- **Real-time Updates**: WebSocket support for notifications

## 📊 Data Model

### Core Tables
- `users` - User accounts with role-based access
- `user_wallets` - Point and cash balance management
- `bin_locations` - Waste bin coordinates and radius data
- `video_submissions` - Video metadata and processing status
- `submission_events` - Complete audit trail of all actions
- `cashout_requests` - Point-to-cash conversion requests
- `payout_transactions` - Payment gateway integration tracking
- `reports_cache` - Cached analytics for performance

### Enums & Statuses
- **User Roles**: TOURIST, MODERATOR, COUNCIL, FINANCE
- **Submission Status**: QUEUED → AUTO_VERIFIED → NEEDS_REVIEW → APPROVED/REJECTED
- **Payout Status**: PENDING → INITIATED → SUCCEEDED/FAILED/NEEDS_INFO
- **Payment Methods**: BANK_TRANSFER, PAYPAL, STRIPE, CASH

## 🔄 Key Workflows

### Video Submission Pipeline
1. **Upload**: User submits video with GPS coordinates
2. **Processing**: FFmpeg extracts metadata and generates thumbnails
3. **Validation**: Automated checks for GPS accuracy, duration, and duplicates
4. **Scoring**: AI-powered quality assessment with configurable thresholds
5. **Routing**: High-scoring videos auto-approve, others go to human review

### Cash-out Process
1. **Request**: User converts points to cash with payment method
2. **Validation**: System checks minimum amounts and user limits
3. **Processing**: Finance team initiates payout via payment gateway
4. **Webhook Handling**: Real-time status updates from payment providers
5. **Settlement**: Points debited on successful payout, refunded on failure

### Moderation Workflow
1. **Queue Management**: Prioritized review queue with risk scoring
2. **Review Interface**: Video player, map view, and metadata display
3. **Decision Making**: One-click approve/reject with reason tracking
4. **Fraud Detection**: Automated tools for duplicate and suspicious content
5. **Audit Logging**: Complete trail of all moderation decisions

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Redis server
- AWS S3 account (for file storage)
- FFmpeg installed on system

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd waste-management-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   # Configure your environment variables
   ```

4. **Database Setup**
   ```bash
   npm run db:migrate
   npm run db:generate
   npm run db:seed
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

### Environment Variables
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/waste_management"

# Redis
REDIS_URL="redis://localhost:6379"

# AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your_bucket_name

# JWT
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret

# Payment Gateways
STRIPE_SECRET_KEY=your_stripe_secret
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_secret
```

## 📱 User Interface

### Dashboard Layouts
- **Tourist Dashboard**: Video upload, submission tracking, wallet management
- **Moderator Dashboard**: Review queue, fraud tools, audit logs
- **Council Dashboard**: Participation metrics, analytics, reporting
- **Finance Dashboard**: Payout management, transaction history, reconciliation

### Key Components
- **VideoPlayer**: Custom video player with controls and thumbnails
- **MapView**: Interactive maps using Leaflet for location visualization
- **ModerationQueue**: Streamlined review interface for content moderators
- **FraudTools**: Comprehensive fraud detection and investigation tools
- **Analytics**: Rich data visualization with charts and export capabilities

## 🔒 Security Features

- **Role-based Access Control**: Granular permissions for each user role
- **JWT Authentication**: Secure token-based authentication with refresh
- **Audit Logging**: Complete trail of all system actions
- **Input Validation**: Zod schema validation for all API endpoints
- **Rate Limiting**: Protection against abuse and spam
- **Data Encryption**: Sensitive data encrypted at rest

## 📈 Performance & Scalability

- **Database Optimization**: Efficient queries with proper indexing
- **Caching Strategy**: Redis caching for frequently accessed data
- **Background Processing**: Queue-based video processing pipeline
- **CDN Integration**: S3 + CloudFront for global content delivery
- **Monitoring**: Built-in health checks and performance metrics

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# E2E testing
npm run test:e2e
```

## 📦 Deployment

### Production Build
```bash
npm run build
npm start
```

### Docker Deployment
```bash
docker build -t waste-management .
docker run -p 3000:3000 waste-management
```

### Environment Considerations
- **Database**: Use managed PostgreSQL service (AWS RDS, Google Cloud SQL)
- **File Storage**: S3-compatible storage with CDN
- **Queue System**: Redis cluster or managed service
- **Monitoring**: Application performance monitoring (APM) tools

## 🔮 Future Enhancements

### Phase 2 Features
- **Mobile App**: React Native PWA for mobile users
- **Advanced AI**: Machine learning for content quality assessment
- **Real-time Notifications**: WebSocket-based live updates
- **Multi-language Support**: Internationalization for global deployment
- **Advanced Analytics**: Predictive modeling and trend analysis

### Phase 3 Features
- **Blockchain Integration**: Transparent reward distribution
- **IoT Integration**: Smart bin sensors and automated validation
- **Community Features**: User forums and social engagement
- **Gamification**: Achievement systems and leaderboards
- **API Marketplace**: Third-party integrations and extensions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation wiki

---

**Built with ❤️ for sustainable waste management and community engagement**