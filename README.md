# Text4Quiz - SMS-Based Trivia Platform

A full-stack SMS-based trivia application that delivers daily multiple-choice questions to users via text messages. Users sign up with their phone number, set preferences for question categories and delivery times, and receive automated trivia questions through SMS.

## 🚀 Features

- **SMS-Based Interaction**: Users receive daily trivia questions via SMS
- **Smart Scheduling**: Timezone-aware delivery with precision timing
- **AI-Powered Questions**: Dynamic question generation using Google Gemini
- **Admin Dashboard**: Comprehensive management interface
- **User Management**: Phone validation, preferences, and statistics
- **Single-Attempt Delivery**: Reliable message delivery with no duplicates
- **Broadcast System**: Mass messaging capabilities for admins

## 🏗 Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express
- **Database**: PostgreSQL + Drizzle ORM
- **SMS**: Twilio API
- **AI**: Google Gemini 2.5 Flash
- **UI**: shadcn/ui + Tailwind CSS
- **Deployment**: Render

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL database
- Twilio account with phone number
- Google Gemini API key

## 🛠 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/aidrisedai/TextMasterQuiz.git
   cd TextMasterQuiz
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Build the application**
   ```bash
   npm run build
   ```

## 🚦 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production  
npm start            # Start production server
npm run check        # TypeScript type checking
npm run db:push      # Apply database schema changes
```

### Testing SMS Integration

```bash
# Test Twilio service
npx tsx server/services/twilio.ts

# Test question generation
npx tsx server/services/gemini.ts

# Manual SMS testing
npx tsx server/tests/manual-sms-tests.ts
```

## 📱 SMS Commands

Users can text these commands to interact with the system:

- `HELP` - Show available commands
- `SCORE` - View personal statistics  
- `STOP` - Unsubscribe from service
- `RESTART` - Resubscribe to service
- `A`, `B`, `C`, `D` - Answer trivia questions

## 🏛 Architecture

### Directory Structure
```
├── client/           # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Page components
│   │   └── lib/         # Utilities
├── server/           # Express backend
│   ├── services/        # Business logic
│   ├── routes/          # API endpoints
│   └── tests/          # Test files
├── shared/           # Shared types & schema
└── scripts/          # Deployment scripts
```

### Key Services

- **Precision Scheduler**: Exact-time delivery with single-attempt policy
- **Twilio Service**: SMS messaging with delivery tracking
- **Gemini Service**: AI-powered question generation
- **Admin Service**: User management and analytics
- **Monitoring Service**: Health checks and alerts

## 🚀 Deployment

### Render Deployment

1. **Connect GitHub repository** to Render
2. **Create PostgreSQL database** on Render
3. **Create Web Service** with these settings:
   - Build Command: `npm ci && npm run build`
   - Start Command: `npm start`
   - Health Check Path: `/api/health`

4. **Set environment variables** (see `.env.example`)
5. **Deploy** - Render will automatically deploy on push to main

### Manual Deployment

```bash
./scripts/deploy.sh
```

## 🔧 Configuration

### Required Environment Variables

```bash
DATABASE_URL=postgresql://...         # PostgreSQL connection
TWILIO_ACCOUNT_SID=AC...             # Twilio account ID
TWILIO_AUTH_TOKEN=...                # Twilio auth token  
TWILIO_PHONE_NUMBER=+1...            # Sending phone number
GEMINI_API_KEY=...                   # Google Gemini API key
SESSION_SECRET=...                   # Express session secret
NODE_ENV=production                  # Environment mode
```

## 📊 Database Schema

### Core Tables
- `users` - User profiles and preferences
- `questions` - Question bank with categories
- `user_answers` - Answer history and scoring
- `delivery_queue` - Scheduled message delivery
- `admin_users` - Admin authentication
- `broadcasts` - Mass messaging system

## 🔍 Monitoring & Health Checks

- **Health Endpoint**: `/api/health`
- **Admin Dashboard**: Real-time statistics and monitoring
- **SMS Health Monitor**: Circuit breaker for delivery issues
- **Proactive Alerts**: Automated issue detection

## 🛡 Security

- Phone number validation (USA NANP format only)
- Session-based admin authentication
- Environment variable protection
- Input sanitization and validation
- Rate limiting on SMS delivery

## 📈 Performance

- Queue population: ~1 second for 35 users
- SMS delivery: ~500ms per message  
- Question generation: ~2 seconds via Gemini
- Database queries: <50ms average
- Daily API usage: ~40 Twilio, ~20 Gemini calls

## 🐛 Troubleshooting

### Common Issues

1. **Users not receiving messages**
   - Check delivery queue status
   - Verify Twilio credentials
   - Test phone number validity

2. **Database connection errors**
   - Verify DATABASE_URL format
   - Check database server status
   - Test connection with health endpoint

3. **SMS delivery failures**
   - Check Twilio account balance
   - Verify phone number format
   - Review SMS health monitor status

## 📞 Support

For issues and questions:
1. Check the admin dashboard health status
2. Review server logs for errors  
3. Test individual components using test scripts
4. Contact support with specific error messages

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and type checking
5. Submit a pull request

---

**Built with ❤️ for SMS-powered learning**