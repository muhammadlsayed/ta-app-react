# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Teaching Assistant (TA) application** built with React and Supabase for managing course rosters, attendance tracking, quizzes, and student data. The app supports both online (Supabase-backed) and offline (local-only) modes.

## Development Commands

```bash
# Start development server (runs on port 5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Install dependencies
npm install
```

## Initial Setup

1. Copy environment file: `cp .env.example .env` and configure Supabase variables
2. Run database schema: Execute `supabase/schema.sql` in Supabase SQL editor
3. Install dependencies: `npm install`
4. Start development: `npm run dev`

## Architecture

### Tech Stack
- **React 18.3.1** with Vite build tool
- **Supabase** for backend (authentication, database, real-time)
- **XLSX library** for import/export functionality
- **Pure JavaScript/JSX** (no TypeScript)

### Key Directories
- `src/components/` - React components
- `src/context/AppContext.jsx` - Global state management via Context API
- `src/services/supabase.js` - All Supabase operations and API calls
- `src/hooks/useLocalStorage.js` - localStorage persistence
- `src/utils/constants.js` - Configurable constants (WEEKS=12, QUIZZES=6)

### State Management
- **Context API** for global state
- **Local-first approach** - app works offline when `VITE_USE_SUPABASE != 'true'`
- **Hybrid sync** - local state with optional Supabase backend
- Simple view-based routing via string states

### Database Schema
Tables: `courses`, `students`, `enrollments`, `attendance`, `quizzes`, `comments`
- **Row Level Security (RLS)** enabled - instructors only see their data
- **Cascade deletes** - removing course cleans all related data
- **Owner-based access control** via `auth.uid()`

## Key Features

### Data Import/Export
- **CSV/XLSX import** with required fields: `student_id`, `full_name`
- **Optional fields**: `pin`, `section`
- **XLSX export** for roster and attendance summaries

### Attendance System
- **12-week system** (configurable in constants.js)
- **Status options**: Present (P), Absent (A), Late (L)
- **QR scan simulation** for quick attendance marking

### Grade Management
- **6 quizzes per course** (configurable in constants.js)
- **Numeric scores** with per-student comments
- **Section-based filtering** when section data is imported

### Student Portal
- **Self-view access** using student_id + optional PIN
- **Read-only interface** for students to check their records

## Environment Configuration

```bash
VITE_USE_SUPABASE=true          # Toggle online/offline mode
VITE_SUPABASE_URL=your_url      # Supabase project URL
VITE_SUPABASE_ANON_KEY=your_key # Supabase anonymous key
```

## Development Notes

- **No testing framework** - manual testing approach
- **Dark theme** with CSS variables for styling
- **Owner isolation** - each instructor sees only their courses
- **Optimistic updates** - UI updates immediately, syncs to Supabase
- **Educational domain** - built for academic calendar (12 weeks, 6 quizzes)

## Common Customizations

- **Adjust semester length**: Modify `WEEKS` in `src/utils/constants.js`
- **Change quiz count**: Modify `QUIZZES` in `src/utils/constants.js`
- **Add new import fields**: Update CSV/XLSX parsing in ImportModal.jsx
- **Modify attendance statuses**: Update options in Roster.jsx attendance cells