# Sprind - AI Language Learning App - Copilot Instructions

## Architecture Overview

This is a Next.js 15 PWA language learning app with Capacitor for mobile deployment. The app teaches vocabulary across 50 languages using pre-generated TTS audio and a freemium subscription model.

### Core Technology Stack
- **Frontend**: Next.js 15, React 19, TypeScript, TailwindCSS
- **Mobile**: Capacitor 7 for iOS/Android deployment
- **Database**: Supabase (PostgreSQL) with custom vocabulary schema
- **Audio**: Backblaze B2 cloud storage with pre-generated TTS audio files
- **Auth**: Supabase Auth with Google/Apple OAuth
- **Payments**: Stripe with webhook-driven subscription sync
- **UI**: Radix UI components with custom theming

## Key Architectural Patterns

### Audio Service Architecture
The app uses **Backblaze B2 cloud storage** for all audio playback:

```
User Request → /api/universal-audio → B2 Authorization → Stream Audio
```

**Key files:**
- `app/api/universal-audio/route.ts` - Main audio API endpoint
- `backblaze-urls-20250909-180354.csv` - Word ID to B2 file path mappings (132,403 entries)

**Audio flow:**
1. Client requests `/api/universal-audio?wordId=X&languageCode=Y`
2. Server authorizes with B2 using `B2_APPLICATION_KEY_ID` and `B2_APPLICATION_KEY`
3. Server looks up file path in CSV mapping
4. Server streams authenticated audio from B2 bucket to client

### Subscription & Access Control
Access control is **database-driven** with real-time checks:
```typescript
// Pattern: Server-side access validation
lib/subscription/subscription-service.ts  // Server logic
lib/subscription/client-subscription-service.ts  // Client wrapper
contexts/auth-context.tsx  // Global state management
```

**Free tier restriction**: Only topic ID 1 (greetings) is accessible. Premium topics show paywall modal.

### Database Schema Patterns
```sql
-- Core vocabulary structure
topics → vocabulary → vocabulary_translations
-- Subscription model
user_profiles → user_subscriptions → subscription_events
```

**Key principle**: All user access is validated via `checkTopicAccess()` before content display.

## Development Workflows

### Local Development Setup
```bash
npm run dev          # Next.js dev server (port 3000)
npm run setup-auth   # Initialize auth configuration
npm run check-env    # Validate environment variables
```

### Mobile Development
```bash
npm run build && npx cap sync    # Sync web build to mobile
npx cap run android             # Test in Android Studio
npx cap run ios                 # Test in Xcode
```

**Critical**: Always run `npm run build` before mobile sync. Capacitor serves the production build, not dev server.

### Database Management
- Run `supabase-schema.sql` for base vocabulary tables
- Run `database-schema-subscription.sql` for subscription system
- Use Supabase Dashboard SQL Editor for schema changes

## Component Patterns

### Audio Components
Use the unified audio hook pattern:
```tsx
const { playWord, currentWords, isPlaying } = useUnifiedAudio({
  defaultSettings: { autoPlay: false, speed: 'Normal' }
})
```

**Never** instantiate audio services directly. Always use hooks for state management.

### Auth-Aware Components
Wrap premium features with access checks:
```tsx
const { isPremium, checkTopicAccess } = useAuth()
const handleTopicClick = async (topicId: number) => {
  const result = await checkTopicAccess(topicId)
  if (!result.hasAccess) {
    // Show paywall modal
  }
}
```

### Account Section UI
The language selector includes a dedicated account section (first swipeable section) that displays:
- User profile information (name, email)
- Subscription status with upgrade button for free users
- Language preferences (native/learning languages)
- Learning progress statistics
- Sign out functionality

Account section uses glassmorphism design with `bg-white/10 backdrop-blur-sm` styling.

### Form Components
Use React Hook Form + Zod for validation:
```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
```

## Critical Integration Points

### Language System
Language codes follow ISO 639-1 standard. The app supports 50 languages with audio files available in the B2 bucket.

### API Route Structure
```
app/api/
├── vocabulary/          # Core vocabulary CRUD
├── audio/              # Audio generation endpoints
├── subscription/       # Payment & access control
└── auth/              # Authentication flows
```

**Pattern**: All API routes validate user authentication and subscription status before data access.

### Environment Configuration
Required environment variables:
```bash
NEXT_PUBLIC_SUPABASE_URL=     # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Public key
SUPABASE_SERVICE_ROLE_KEY=    # Private key for server operations
STRIPE_SECRET_KEY=            # Payment processing
B2_APPLICATION_KEY_ID=        # Backblaze B2 key ID for audio
B2_APPLICATION_KEY=           # Backblaze B2 application key
```

## Debugging & Troubleshooting

### Audio Issues
1. Check browser console for B2 authorization errors
2. Verify `/api/universal-audio` responses in Network tab
3. Ensure `B2_APPLICATION_KEY_ID` and `B2_APPLICATION_KEY` environment variables are set
4. Check `backblaze-urls-20250909-180354.csv` exists and contains mappings

### Subscription Issues
1. Check `subscription_events` table for webhook logs
2. Verify Stripe webhook endpoint configuration
3. Test payment flow in Stripe test mode

### Mobile Issues
1. Use Chrome DevTools for Android debugging (`chrome://inspect`)
2. Check Capacitor plugin compatibility
3. Verify native permissions in platform-specific configs

## Project-Specific Conventions

### File Organization
- `app/` - Next.js App Router pages and API routes
- `components/` - Reusable UI components (organized by feature)
- `lib/` - Business logic and service classes
- `hooks/` - Custom React hooks
- `contexts/` - React context providers

### Naming Conventions
- Audio services: `*-audio-service.ts`
- React hooks: `use-*.ts`
- API routes: RESTful naming in `app/api/`
- Database functions: Snake_case SQL naming

### Error Handling
Always implement graceful degradation for audio services and premium features. Free tier users should have a functional app experience.

## Testing Strategy

### Manual Testing Priority

2. **Subscription flow** from payment to content unlock
3. **Mobile responsiveness** and PWA installation
4. **Offline functionality** for cached vocabulary

### Key Test Scenarios
- Free user accessing premium topic (should show paywall)
- Payment completion → immediate content unlock
- Mobile audio playback with device volume controls
- Language switching with proper translation loading

## External Dependencies

### Critical Services
- **Supabase**: Database, auth, real-time subscriptions
- **Stripe**: Payment processing with webhook validation
- **Google Cloud TTS**: Primary audio generation
- **Capacitor**: Mobile app wrapper and native integrations

### API Rate Limits
- Google TTS: Monitor usage quotas
- Supabase: Track database connection limits
- Stripe: Webhook retry handling implemented

This codebase prioritizes **audio quality**, **payment reliability**, and **mobile-first experience**. When making changes, always consider the impact on these three pillars.