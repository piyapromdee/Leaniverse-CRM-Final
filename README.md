# LeaniOS - Modern Web App Boilerplate

A comprehensive Next.js boilerplate with authentication, user management, and admin features built with modern technologies.

## Features

- 🔐 **Authentication** - Complete auth system with Supabase
- 👤 **User Dashboard** - Profile management and settings
- ⚙️ **Admin Panel** - User management and global settings
- 🎨 **Modern UI** - Built with Shadcn/ui and TailwindCSS
- 📱 **Responsive Design** - Mobile-first approach
- 🔒 **Security** - Middleware protection and role-based access
- 🚀 **Performance** - Optimized with Next.js 14 and TypeScript

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **UI Components**: Shadcn/ui
- **Backend**: Supabase (Auth + Database)
- **Icons**: Lucide React

## Quick Start

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd leanios
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings → API to get your project URL and anon key
3. Update `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 4. Set up database tables (Optional)

Create the following table in your Supabase dashboard for user profiles:

```sql
-- Create profiles table
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  first_name text,
  last_name text,
  role text default 'user',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

-- Create policy for users to read their own profile
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

-- Create policy for users to update their own profile
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your application.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # User dashboard
│   ├── admin/             # Admin panel
│   └── page.tsx           # Home page
├── components/            # Reusable components
│   ├── ui/               # Shadcn/ui components
│   └── dashboard-layout.tsx
├── lib/                   # Utility functions
│   └── supabase/         # Supabase client configuration
└── middleware.ts          # Authentication middleware
```

## Key Features

### Authentication
- Sign up / Sign in pages
- Protected routes with middleware
- User session management

### User Dashboard
- Personal profile management
- Settings and preferences
- Account security options

### Admin Panel
- User management interface
- Global application settings
- System monitoring
- Role-based access control

## Customization

### Adding New Pages
1. Create new page files in the `src/app` directory
2. Use the `DashboardLayout` component for authenticated pages
3. Add navigation items in `dashboard-layout.tsx`

### Styling
- Modify `tailwind.config.js` for custom styles
- Update Shadcn/ui theme in `src/app/globals.css`
- Add custom components in `src/components`

## Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## License

MIT License - feel free to use this project for personal or commercial purposes.
