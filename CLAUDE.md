# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LeaniOS is a modern SaaS boilerplate built with Next.js 15 (App Router), React 19, TypeScript, and Supabase. It provides authentication, user management, admin functionality, and role-based access control out of the box.

## Development Commands

```bash
# Development (with deprecation warnings suppressed)
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# TypeScript
npx tsc --noEmit     # Type checking without compilation
```

### Note on Deprecation Warnings
- Scripts include `NODE_NO_WARNINGS=1` to suppress Node.js deprecation warnings
- This prevents annoying punycode deprecation warnings from ESLint dependencies
- All functionality remains intact while providing cleaner output

## Architecture Overview

### Authentication System
The app uses Supabase for authentication with three client configurations:
- **Browser Client** (`src/lib/supabase/client.ts`) - Client-side operations
- **Server Client** (`src/lib/supabase/server.ts`) - SSR with cookie management
- **Middleware Client** (`src/lib/supabase/middleware.ts`) - Route protection

### Route Structure
- `/` - Public landing page
- `/auth/*` - Authentication pages (sign-in, sign-up)
- `/dashboard/*` - User dashboard (profile, settings)
- `/admin/*` - Admin panel (user management, system settings)

### Database Schema
Expects a `profiles` table with user metadata and role-based permissions. Uses Row Level Security (RLS) for data protection.

### Component Architecture
- **RootLayout** - Base HTML structure with font loading
- **DashboardLayout** - Authenticated user interface with responsive sidebar
- **Shadcn/ui** components - Consistent design system with Radix UI primitives

### Security Implementation
- Middleware-based route protection (all routes except `/`, `/auth/*`, `/api/*`)
- Role-based access control (admin vs user permissions)
- Session management with HTTP-only cookies
- Database-level security with RLS policies

## Key Technologies

- **Frontend**: Next.js 15, React 19, TypeScript, TailwindCSS v4
- **UI Components**: Shadcn/ui with Radix UI primitives
- **Backend**: Supabase (auth, database, real-time)
- **Icons**: Lucide React
- **Fonts**: Geist Sans and Mono

## Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Development Notes

- Uses App Router with server components by default
- Client components explicitly marked with 'use client'
- Admin functionality automatically appears for users with admin role
- Mobile-first responsive design approach
- Full TypeScript implementation throughout
- **IMPORTANT**: Do not run `npm run dev` - the user will always handle starting the development server
- **IMPORTANT**: Never commit changes or execute any git commands without explicit permission from the user

## UI/UX Guidelines

- **Admin Page Titles**: Do not include page titles (h1) in admin pages since AdminLayout already displays the page name in the header. Only include descriptive text (p tags) below where the title would be.
- **Consistent Layouts**: All admin pages should follow the same structure without redundant titles