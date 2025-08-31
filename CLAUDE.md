# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development
- `pnpm dev` - Start development server (Next.js development mode)
- `pnpm build` - Build the application for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint for code linting

### Package Management
This project uses `pnpm` as the package manager instead of npm.

## Architecture Overview

### Application Type
This is a Next.js 15.2.4 application built with React 19 for interview scheduling. The app is called "Hansee" and helps coordinate interview time slots between interviewers and candidates.

### Tech Stack
- **Framework**: Next.js 15.2.4 with App Router
- **UI Components**: Radix UI primitives with custom components in `/components/ui/`
- **Styling**: Tailwind CSS with custom component styling
- **Forms**: React Hook Form with Zod validation
- **Animations**: Framer Motion for UI transitions
- **Date Handling**: date-fns and react-day-picker
- **Icons**: Lucide React
- **Fonts**: Geist Sans and Geist Mono

### Key Directory Structure
- `/app/` - Next.js App Router pages and layouts
- `/components/` - Reusable React components
  - `/components/ui/` - Shadcn/UI-style components (buttons, forms, etc.)
  - `/components/calendar/` - Calendar-specific components
- `/types/` - TypeScript type definitions
- `/utils/` - Utility functions for calendar and time slot logic
- `/hooks/` - Custom React hooks

### Main User Flows
1. **Create Interview Event** (`/app/create/`) - Multi-step wizard for setting up interviews
2. **Event Dashboard** (`/app/events/[eventid]/dashboard/`) - View and manage created events
3. **Candidate Response** (`/app/respond/[eventid]/`) - Interface for candidates to select availability
4. **Landing Page** (`/app/page.tsx`) - Marketing page explaining the service

### State Management
The application uses React's built-in state management with useState and component-level state. No external state management library is currently used.

### Development Notes
- The Next.js config has TypeScript and ESLint errors ignored during builds
- Images are configured as unoptimized
- The app supports both Korean and English text (primarily Korean UI)

### Calendar System
The core functionality revolves around calendar and time slot management:
- Drag-to-select time slots interface
- 30-minute time slot intervals
- Multi-date selection support
- Conflict resolution for overlapping appointments