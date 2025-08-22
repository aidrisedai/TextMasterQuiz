# Text4Quiz - SMS Trivia Application

## Overview
Text4Quiz is a full-stack SMS-based trivia application that delivers daily trivia questions to users via text messages. Users can sign up with their phone number, set preferences for question categories and delivery times, and receive automated trivia questions through SMS. The application tracks user statistics including streaks, accuracy rates, and total scores.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Updates (August 22, 2025)
- **Critical Bug Fix - Timezone Handling**: Fixed `getTodayDeliveryStatus()` function that was using local time instead of UTC, causing midnight queue population failures. Changed `setHours()` to `setUTCHours()` to properly handle UTC times.
- **Documentation**: Created comprehensive PLATFORM_WALKTHROUGH.md for engineer onboarding, covering entire system architecture, troubleshooting guides, and known issues.
- **Manual Queue Recovery**: Populated missing August 22 deliveries for 31 users after discovering midnight job failure.

## Previous Updates (August 21, 2025)
- **Phone Validation System**: Implemented comprehensive USA phone number validation both frontend and backend. Auto-formats input, validates against NANP rules, rejects test numbers (555 prefix), and provides real-time feedback.
- **Frontend Validation**: Enhanced PhoneInput component with real-time validation showing green checkmarks for valid numbers, red X for invalid, and yellow warning for test numbers.
- **Backend Protection**: All signups now validate phone numbers server-side, auto-correcting formatting and rejecting invalid area codes.

## System Architecture
The application follows a modern full-stack architecture with:

**Core Technologies**:
- **Frontend**: React with TypeScript, using Vite as the build tool.
- **Backend**: Node.js with Express.js server.
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations.
- **UI Framework**: shadcn/ui components built on Radix UI primitives.
- **Styling**: Tailwind CSS with custom design system.
- **SMS Service**: Twilio integration for message delivery.
- **AI Integration**: Google Gemini API for dynamic question generation.
- **Deployment**: Configured for Replit with autoscale deployment.

**Backend Services**:
- **Database Layer**: Uses Neon serverless PostgreSQL with connection pooling and Drizzle ORM. Implements repository pattern with `IStorage` interface.
- **SMS Service**: Handles SMS delivery through Twilio API with graceful fallback and error handling.
- **AI Question Generation**: Integrates with Google Gemini 2.5 Flash for dynamic question creation with a fallback system. Generates structured question formats with explanations.
- **Queue-Based Scheduler** (Replaced broken timezone-matching scheduler on Aug 20, 2025): Pre-calculates delivery times in UTC and stores them in a `delivery_queue` table. Runs every 15 minutes to process pending deliveries. Achieves reliable delivery rates compared to the previous scheduler's 11-17% success rate.

**Frontend Architecture**:
- **React Application**: TypeScript-first development, component-based architecture using shadcn/ui, React Query for server state management, and Wouter for client-side routing.
- **Form Management**: React Hook Form with Zod validation, type-safe form schemas, and comprehensive error handling.
- **UI Components**: Consistent design system using CSS variables, responsive design with a mobile-first approach, and accessible components built on Radix UI.
- **UI/UX Decisions**: Consistent header UI/UX across admin panel sections, responsive layouts for mobile, improved readability with proper spacing and dark mode support, and enhanced action buttons with mobile-friendly touch targets.

**Database Schema**:
The application uses three main entities:
1. **Users**: Stores user preferences, statistics, and contact information.
2. **Questions**: Contains trivia questions with multiple-choice answers.
3. **UserAnswers**: Tracks user responses and scoring history.

**Data Flow**:
- **User Registration**: User submits signup form, backend validates, creates user record, and sends a welcome SMS via Twilio.
- **Question Delivery**: Scheduler checks for users needing questions, generates questions via Google Gemini or selects from the database, and sends SMS to users at their preferred time.
- **Answer Processing**: Users reply via SMS, webhook processes incoming messages, and user statistics are updated based on correctness.

**Authentication**: Custom username/password authentication for admin access, replacing Google OAuth.

**Deployment Strategy**: Configured for Replit's autoscale deployment, supporting development, build, and production environments with a single Node.js process serving both API and static files.

## External Dependencies
- **Neon Database**: Serverless PostgreSQL hosting.
- **Twilio**: SMS messaging service.
- **Google Gemini**: AI-powered question generation.
- **Replit**: Development and deployment platform.