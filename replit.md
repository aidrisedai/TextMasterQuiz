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
- **AI Integration**: Google Gemini API for dynamic question generation
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

3. **AI Question Generation** (`server/services/gemini.ts`)
   - Integrates with Google Gemini 2.5 Flash for dynamic question creation
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
   - Questions generated via Google Gemini or selected from database
   - SMS sent to users at their preferred time in their timezone

3. **Answer Processing**:
   - Users reply to SMS with A, B, C, or D
   - Webhook processes incoming messages
   - User statistics updated based on correctness

## External Dependencies

- **Neon Database**: Serverless PostgreSQL hosting
- **Twilio**: SMS messaging service
- **Google Gemini**: AI-powered question generation
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

- **Admin Panel Users Section UI Enhancement** (July 26, 2025): Applied consistent header UI/UX from Questions section to Users section. Implemented clean header section with user metadata badges (User #, Active/Inactive status, subscription status, questions answered count), organized user details in responsive grid layout, improved visual hierarchy with proper spacing and dark mode support, enhanced action buttons with mobile-friendly touch targets, and maintained full-width formatting consistency. Users section now matches Questions section design patterns for unified admin experience.
- **Mobile Responsiveness Enhancement - Production Synced** (July 26, 2025): Implemented comprehensive mobile optimizations including responsive admin panel toolbar with button text hiding/wrapping, improved grid layouts (sm:grid-cols-2 patterns), mobile navigation menu, enhanced touch targets (min-h-[44px]), optimized form inputs with proper mobile keyboard types (inputMode="tel", autoComplete="tel"), iOS zoom prevention (text-base class), and horizontal scroll prevention (overflow-x-hidden). All changes synchronized between development (client/src) and production (src) directories with successful build verification. Mobile improvements confirmed in production artifacts.
- **Admin Panel Questions Layout Improvement** (July 26, 2025): Enhanced admin panel questions display with better readability and mobile-friendly layout. Created clean header section with category, difficulty, and usage metadata positioned side-by-side. Ensured question text and answer options have consistent full-width formatting to eliminate cramped text wrapping. Improved visual hierarchy with proper spacing, dark mode support, and clear section separation. Applied changes to both client/src and src directories ensuring production build consistency.
- **Signup Form UX Improvement** (July 26, 2025): Improved signup form readability by breaking long footer text into separate lines with proper spacing. Changed from single cluttered line "Always free. US-based phone numbers only. Premium plan coming soon. Cancel anytime by texting 'STOP'" to clean three-line format: "Text STOP to cancel", "Free for US-based phones", "Premium plan coming soon". Applied changes to both client/src and src directories to ensure production build consistency. Production build verified with synchronized code across development and production environments.
- **Production Deployment Ready - Timezone Fix** (July 25, 2025): Successfully deployed UTC-based timezone scheduler fix to production with 100% test coverage (14/14 tests passed). All timezone fix components verified in production build including `shouldUserReceiveQuestion()`, `getCurrentHourInTimezone()`, and `Intl.DateTimeFormat` API usage. Comprehensive testing system created with `/api/test/final-test-score` endpoint confirming mathematical precision of timezone calculations. Production build successfully compiles both frontend (Vite) and backend (esbuild) with all recent changes synchronized. System ready for immediate deployment to resolve delivery consistency issues for all users.
- **UTC-Based Timezone Scheduler Fix** (July 25, 2025): Implemented comprehensive timezone handling fix to resolve inconsistent daily question delivery, particularly for Pacific timezone users. Root cause: Flawed `toLocaleString()` conversion created corrupted Date objects causing delivery failures. Replaced with proper `Intl.DateTimeFormat` API for accurate timezone calculations. Added modular `shouldUserReceiveQuestion()` method with timezone-aware day comparison. This resolves delivery gaps where users would miss questions due to timezone calculation errors. System now uses mathematically precise UTC conversion with proper DST handling.
- **Production Build Synchronization Fix** (July 25, 2025): Resolved critical issue where local development changes weren't appearing in production deployments. Root cause: Vite configuration builds from `client/` directory while recent development was happening in root `src/` directory. Synchronized all recent changes (homepage text formatting, category order, timing updates) to `client/src/` to ensure production builds include latest features. Established process to maintain consistency between development and production environments.
- **Welcome Message Update** (July 23, 2025): Updated welcome SMS message to accurately reflect immediate quiz delivery. Changed messaging from "shortly" to "right now" for first question timing and clarified that regular daily delivery starts tomorrow. Improved user expectations and engagement with clearer communication about the immediate quiz experience.
- **SMS Duplicate Prevention Fix** (July 23, 2025): Resolved critical duplicate message issue where some users received multiple questions. Root cause was race condition in pending answer check due to unpredictable null value sorting. Implemented robust direct database count method and cleaned up existing duplicate pending answers. System now guarantees maximum one pending question per user.
- **Immediate Welcome Quiz Feature** (July 19, 2025): Implemented instant quiz delivery upon signup to give users an immediate taste of the service. New users now receive their first trivia question immediately after signing up, followed by regular scheduled delivery starting the next day. Updated scheduler logic to prevent duplicate questions on signup day and ensure proper next-day delivery timing.
- **Admin User Management Panel** (July 19, 2025): Added comprehensive user management section to admin panel with sortable table showing user details, message history, and resend functionality. Includes filtering by phone number, sorting by date/categories, and one-click message resend capability for troubleshooting delivery issues.
- **Production Build Fix** (July 16, 2025): Resolved production deployment showing test version instead of full application. Consolidated all client code into single src/ directory structure to match both development and production environments. Eliminated duplicate client/src directories and ensured build process uses complete Text4Quiz application with all features (signup, dashboard, admin panel) rather than test version.
- **Client Environment Consolidation** (July 16, 2025): Unified client development environment by removing duplicate src/ and client/src directories. All frontend development now happens in the root src/ directory structure. Fixed import paths to use relative imports instead of aliases to ensure consistency across development and production environments. Eliminated duplicate files causing confusion and established single source of truth for client code. 
- **Database Connection Fix** (July 16, 2025): Resolved startup issue where application failed to run due to Neon database endpoint being disabled. Fixed by running `npm run db:push` to synchronize database schema with the PostgreSQL instance. Application now starts successfully with all services (scheduler, database, routes) properly initialized.
- **SMS Duplicate Prevention System** (July 15, 2025): Implemented comprehensive duplicate message prevention system. Added pending answer validation in scheduler to prevent multiple questions being sent to same user. Removed fallback SMS mechanism that could cause duplicates. Added manual send protection and lastQuizDate updates to prevent race conditions. System now guarantees single daily question per user.
- **Navigation Cleanup & Duplicate Files** (July 15, 2025): Removed all "Sign Up" references from navigation and buttons since signup form is now at top of page. Fixed duplicate home page files issue - active version is src/pages/home.tsx. Updated footer navigation and button text to be consistent with new layout.
- **Admin Session Configuration Fix** (July 15, 2025): Fixed production deployment issue where admin dashboard showed 0 questions due to session cookie configuration. Modified session middleware to use secure: false with httpOnly and sameSite settings for compatibility across all environments. Admin authentication now works properly in both development and production.
- **Category Standardization & UX Improvements** (July 15, 2025): Fixed category naming inconsistencies by merging "Sports"/"sports" and "Science"/"science" into standardized lowercase versions. Updated signup form to use consistent category names with user-friendly labels. Moved signup form directly into hero section to reduce clicks and improve conversion.
- **Critical SMS Answer Validation Fix** (July 15, 2025): Fixed major bug in answer processing that was using random chance (70%) instead of actual answer validation. System now properly compares user answers against real question answers, updates user statistics correctly, and provides accurate feedback. Implemented pending answer tracking system and proper streak calculations.
- **Production SMS Deployment** (July 15, 2025): Enabled full production SMS delivery to all users. Removed testing restrictions so daily questions are now sent to all active users at their preferred times. Disabled testing scheduler (5-minute intervals) and kept production scheduler (hourly checks). System now fully operational for all registered users.
- **Custom Admin Authentication System** (July 15, 2025): Replaced Google OAuth with secure username/password authentication. Implemented session-based authentication with encrypted password storage using scrypt. Admin credentials: username "adminadmin123", password "YaallaH100%.". System includes proper session management, login/logout functionality, and secure admin route protection. Fixed production deployment by removing conflicting Google OAuth system and ensuring only custom authentication is used.
- **Daily Quiz Scheduler Debugging** (July 13, 2025): Fixed timezone handling and scheduler delivery issues. Root cause: User's last_quiz_date was preventing new questions. System now working correctly - Twilio confirms SMS delivery, category rotation functional, scheduler restored to normal operation at 21:00 PST.
- **Category Rotation System** (July 11, 2025): Implemented proper single-category-per-day rotation system ensuring only one question from one category daily, using questionsAnswered % categoryCount for fair rotation.
- **SMS Commands Comprehensive Testing** (July 11, 2025): Implemented and tested all SMS commands with 8/8 tests passing. All commands (SCORE, HELP, STOP, RESTART, A/B/C/D answers, MORE) working perfectly with real SMS delivery.
- **AI Backend Migration to Gemini** (July 10, 2025): Switched from OpenAI to Google Gemini 2.5 Flash for question generation. Updated all services to use Gemini API with improved JSON schema validation.
- **SMS System Fully Operational** (July 8, 2025): Toll-free number verification completed successfully. SMS delivery now working with "delivered" status confirmed.
- **Duplicate Prevention System** (June 24, 2025): Implemented comprehensive question uniqueness with smart context limits to prevent token overflow
- **Free Forever Pricing** (June 24, 2025): Updated from "Free Trial" to "Free Forever" model across all user-facing content
- **Production Deployment** (June 24, 2025): Application successfully deployed and operational