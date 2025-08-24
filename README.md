# Waste Management Video Submission System

A comprehensive video submission and verification system for waste management, built with Next.js, TypeScript, and PostgreSQL.

## 🎯 Project Overview

This system enables users to submit videos of proper waste disposal, earn points for verified submissions, and cash out rewards. It includes role-based access control for tourists, moderators, city council members, and finance administrators.

## ✨ Features

### Tourist Features
- **Video Upload**: Drag & drop video submission with GPS coordinates
- **Profile & Wallet**: Track points balance and earnings
- **Submission Status**: Monitor video review progress
- **Cash Out**: Convert points to real money via multiple payment methods
- **Notifications**: Real-time updates on submissions and payouts

### Moderator Features
- **Review Queue**: Efficient video review interface with video player
- **Auto-Verification**: AI-powered scoring system with manual override
- **Fraud Detection**: Duplicate detection, GPS validation, rate limiting
- **Audit Trail**: Complete action logging for compliance

### Admin Features
- **Dashboard Analytics**: Participation metrics, location heatmaps
- **Payment Processing**: Automated payout management
- **Reporting**: Export data for city council analysis
- **System Configuration**: Adjust scoring thresholds and rules

## 🏗️ Architecture

### Frontend
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **React Hook Form** with Zod validation
- **Lucide React** for icons

### Backend
- **Node.js** with Next.js API routes
- **PostgreSQL** with Prisma ORM
- **Redis** for caching and job queues
- **AWS S3** for video storage
- **FFmpeg** for video processing

### Key Workflows
1. **Video Submission**: Upload → Processing → Scoring → Auto-Review/Manual Review
2. **Points System**: Approved videos → Points → Wallet → Cash Out
3. **Payment Flow**: Request → Processing → Gateway → Webhook → Completion

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- Redis 6+
- FFmpeg (for video processing)

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
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Database Setup**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Run migrations
   npm run db:migrate
   
   # Seed initial data (optional)
   npm run db:seed
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/waste_management"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-here"

# AWS S3
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="your-waste-management-bucket"

# Redis
REDIS_URL="redis://localhost:6379"

# Stripe Payments
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

## 📁 Project Structure

```
├── app/                    # Next.js App Router
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/            # React components
│   ├── auth/             # Authentication forms
│   ├── dashboard/        # Role-based dashboards
│   ├── layout/           # Layout components
│   ├── ui/               # Reusable UI components
│   ├── video/            # Video-related components
│   ├── submissions/      # Submission management
│   ├── wallet/           # Wallet and points
│   └── cashout/          # Cash out functionality
├── lib/                  # Utility libraries
│   ├── auth.ts           # Authentication utilities
│   ├── db.ts             # Database connection
│   └── video-processing.ts # Video processing logic
├── prisma/               # Database schema and migrations
│   └── schema.prisma     # Prisma schema
├── types/                # TypeScript type definitions
│   └── index.ts          # Main types
├── utils/                 # Utility functions
│   └── cn.ts             # Class name utilities
└── package.json          # Dependencies and scripts
```

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:migrate   # Run database migrations
npm run db:generate  # Generate Prisma client
npm run db:seed      # Seed database with sample data
```

### Database Schema

The system uses PostgreSQL with the following core tables:

- **users**: User accounts with role-based access
- **user_wallets**: Points and cash balances
- **video_submissions**: Video metadata and status
- **bin_locations**: Designated waste disposal areas
- **submission_events**: Audit trail for all actions
- **cashout_requests**: Payment requests and status
- **payout_transactions**: Payment gateway integration

### API Endpoints

#### Public (Auth Required)
- `POST /api/auth/login` - User authentication
- `POST /api/auth/signup` - User registration
- `GET /api/auth/me` - Get current user profile
- `POST /api/submissions` - Create video submission
- `GET /api/submissions` - List user submissions
- `POST /api/cashouts` - Request cash out
- `GET /api/cashouts` - List cash out requests

#### Admin Only
- `GET /api/admin/submissions` - Review queue
- `POST /api/admin/submissions/:id/approve` - Approve submission
- `POST /api/admin/submissions/:id/reject` - Reject submission
- `GET /api/admin/reports` - Analytics and reporting

## 🎨 UI Components

### Design System
- **Color Palette**: Primary, success, warning, and danger variants
- **Typography**: Inter font family with consistent sizing
- **Spacing**: 4px base unit system
- **Components**: Button, Input, Card, Badge, and more

### Responsive Design
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Flexible grid system with auto-fit columns

## 🔒 Security Features

- **JWT Authentication** with refresh tokens
- **Role-based Access Control** (RBAC)
- **Input Validation** with Zod schemas
- **SQL Injection Protection** via Prisma ORM
- **File Upload Security** with type and size validation
- **Rate Limiting** to prevent abuse
- **Audit Logging** for compliance

## 📊 Scoring System

### Auto-Verification Criteria
- **Geographic Score**: Proximity to designated bins
- **Time Score**: Recording timestamp validity
- **Duration Score**: Video length requirements
- **Duplicate Score**: Fraud detection and rate limiting

### Thresholds
- **Auto-Approve**: Score ≥ 0.8
- **Human Review**: Score 0.3 - 0.8
- **Auto-Reject**: Score < 0.3

## 🚀 Deployment

### Production Build
```bash
npm run build
npm run start
```

### Environment Considerations
- Set `NODE_ENV=production`
- Configure production database and Redis
- Set up proper SSL certificates
- Configure CDN for video delivery
- Set up monitoring and logging

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the code examples

## 🔮 Roadmap

### Phase 1 (Weeks 1-2)
- [x] Authentication system
- [x] Basic UI components
- [x] Database schema
- [x] Video upload functionality

### Phase 2 (Weeks 3-4)
- [ ] Video processing pipeline
- [ ] GPS validation
- [ ] Auto-scoring system
- [ ] User dashboard

### Phase 3 (Weeks 5-6)
- [ ] Moderation interface
- [ ] Points system
- [ ] Cash out flow
- [ ] Payment integration

### Phase 4 (Weeks 7-8)
- [ ] Admin dashboards
- [ ] Reporting system
- [ ] Notifications
- [ ] Testing and hardening

### Future Enhancements
- [ ] Mobile PWA
- [ ] ML-powered fraud detection
- [ ] Advanced analytics
- [ ] Multi-language support
- [ ] API rate limiting
- [ ] Webhook integrations