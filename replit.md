# Text4Quiz - SMS Trivia Application

## Overview

Text4Quiz is a full-stack SMS-based trivia application that delivers daily trivia questions to users via text messages. Users can sign up with their phone number, set preferences for question categories and delivery times, and receive automated trivia questions through SMS. The application tracks user statistics including streaks, accuracy rates, and total scores.

## System Architecture

The application follows a modern full-stack architecture with:

- **Frontend**: React with TypeScript, using Vite as the build tool
- **Backend**: Node.js with Express.js server
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **SMS Service**: Twilio integration for message delivery
- **AI Integration**: OpenAI API for dynamic question generation
- **Deployment**: Configured for Replit with autoscale deployment

## Key Components

### Backend Services

1. **Database Layer** (`server/db.ts`, `server/storage.ts`)
   - Uses Neon serverless PostgreSQL with connection pooling
   - Drizzle ORM provides type-safe database operations
   - Implements repository pattern with `IStorage` interface

2. **SMS Service** (`server/services/twilio.ts`)
   - Handles SMS delivery through Twilio API
   - Graceful fallback when credentials are missing
   - Comprehensive error handling and logging

3. **AI Question Generation** (`server/services/openai.ts`)
   - Integrates with OpenAI GPT-4o for dynamic question creation
   - Fallback system for when API is unavailable
   - Structured question format with explanations

4. **Scheduler Service** (`server/services/scheduler.ts`)
   - Cron-based scheduling for daily question delivery
   - Timezone-aware question timing
   - Handles user preference matching

### Frontend Architecture

1. **React Application** (`client/src/`)
   - TypeScript-first development
   - Component-based architecture using shadcn/ui
   - React Query for server state management
   - Wouter for client-side routing

2. **Form Management**
   - React Hook Form with Zod validation
   - Type-safe form schemas matching backend validation
   - Comprehensive error handling and user feedback

3. **UI Components**
   - Consistent design system using CSS variables
   - Responsive design with mobile-first approach
   - Accessible components built on Radix UI

### Database Schema

The application uses three main entities:

1. **Users**: Stores user preferences, statistics, and contact information
2. **Questions**: Contains trivia questions with multiple choice answers
3. **UserAnswers**: Tracks user responses and scoring history

## Data Flow

1. **User Registration**:
   - User submits signup form with phone number and preferences
   - Backend validates data and creates user record
   - Welcome SMS sent via Twilio service

2. **Question Delivery**:
   - Scheduler service runs hourly to check for users needing questions
   - Questions generated via OpenAI or selected from database
   - SMS sent to users at their preferred time in their timezone

3. **Answer Processing**:
   - Users reply to SMS with A, B, C, or D
   - Webhook processes incoming messages
   - User statistics updated based on correctness

## External Dependencies

- **Neon Database**: Serverless PostgreSQL hosting
- **Twilio**: SMS messaging service
- **OpenAI**: AI-powered question generation
- **Replit**: Development and deployment platform

## Deployment Strategy

The application is configured for Replit's autoscale deployment:

- **Development**: `npm run dev` starts both frontend and backend
- **Build**: Vite builds frontend, esbuild bundles backend
- **Production**: Single Node.js process serves both API and static files
- **Database**: Automatic connection to provisioned PostgreSQL instance

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- **SMS Testing Success** (June 24, 2025): Twilio account upgraded to full status, SMS delivery now working to verified phone numbers
- **Duplicate Prevention System** (June 24, 2025): Implemented comprehensive question uniqueness with smart context limits to prevent OpenAI token overflow
- **Free Forever Pricing** (June 24, 2025): Updated from "Free Trial" to "Free Forever" model across all user-facing content
- **Production Deployment** (June 24, 2025): Application successfully deployed and operational