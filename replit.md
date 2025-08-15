# Text4Quiz - SMS Trivia Application

## Overview
Text4Quiz is a full-stack SMS-based trivia application that delivers daily trivia questions to users via text messages. Users can sign up with their phone number, set preferences for question categories and delivery times, and receive automated trivia questions through SMS. The application tracks user statistics including streaks, accuracy rates, and total scores.

## User Preferences
Preferred communication style: Simple, everyday language.

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
- **Scheduler Service**: Cron-based scheduling for daily question delivery, time-zone-aware question timing, and user preference matching.

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