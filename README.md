# Project Status Dashboard

## Overview
A modern project management dashboard that enables teams to track project progress, milestones, and key metrics in real-time. Built with React, TypeScript, and Supabase, it provides a comprehensive solution for project status tracking and team collaboration.

## Features

### Authentication & User Management
- **Multiple Sign-in Options**
  - Email/password authentication
  - Google OAuth integration
  - Secure session management
  - User profile customization

### Project Dashboard
- **Project Health Tracking**
  - Visual health indicators with percentage-based status bars
  - Color-coded status indicators (blue, green, yellow, red)
  - Real-time project health calculations
  - Version history tracking

### Budget Management
- **Comprehensive Budget Tracking**
  - Total budget overview
  - Actual vs. forecast visualization
  - Real-time budget utilization metrics
  - Automatic status indicators for budget health

### Milestone Management
- **Interactive Timeline**
  - Visual milestone progress tracking
  - Completion percentage indicators
  - Owner assignment and tracking
  - Color-coded status system

### Team Collaboration
- **Team Management**
  - Project sponsor designation
  - Business lead assignment
  - Project manager tracking
  - Role-based access control

### Status Updates
- **Progress Tracking**
  - Accomplishments logging
  - Next period activity planning
  - Risk and issue tracking
  - Consideration items management

### Export & Sharing
- **Report Generation**
  - Export to JPG functionality
  - Shareable project URLs
  - Version comparison
  - Project duplication

## Technical Stack

### Frontend
- React 18
- TypeScript
- Vite
- TailwindCSS
- Shadcn/ui Components
- Lucide Icons
- React Router v6

### Backend & Services
- Supabase
  - Authentication (Email & OAuth)
  - Real-time Database
  - Row Level Security
  - Real-time Updates

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation
1. Clone the repository
```bash
git clone <repository-url>
cd project-status-dashboard
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
```
Add your Supabase credentials:
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. Start the development server
```bash
npm run dev
```

### Database Schema
The application uses the following Supabase tables:
- projects (main project information)
- milestones (project timeline events)
- accomplishments (completed items)
- next_period_activities (upcoming work)
- risks (project risks and issues)
- considerations (items for review)
- project_versions (version history)

Refer to `src/types/supabase.ts` for detailed table structures.

## Contributing
Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Support
For support, please open an issue in the repository or contact our support team.

## Acknowledgments
- Shadcn/ui for the component library
- Lucide for the icon set
- Supabase for the backend infrastructure

- DEPENDENCIES:
- # Core React packages
npm install react@^18.2.0 react-dom@^18.2.0 react-router@^6.23.1 react-router-dom@^6.23.1

# Radix UI Components (all in one command)
npm install @radix-ui/react-accordion @radix-ui/react-alert-dialog @radix-ui/react-aspect-ratio @radix-ui/react-avatar @radix-ui/react-checkbox @radix-ui/react-collapsible @radix-ui/react-context-menu @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-hover-card @radix-ui/react-label @radix-ui/react-menubar @radix-ui/react-navigation-menu @radix-ui/react-popover @radix-ui/react-progress @radix-ui/react-radio-group @radix-ui/react-scroll-area @radix-ui/react-select @radix-ui/react-separator @radix-ui/react-slider @radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-toast @radix-ui/react-toggle @radix-ui/react-tooltip

# Styling & UI Utilities
npm install tailwindcss@^3.4.1 tailwind-merge@^2.3.0 tailwindcss-animate@^1.0.7 class-variance-authority@^0.7.0 clsx@^2.1.1

# UI Libraries & Components
npm install lucide-react@^0.394.0 vaul@^0.9.1 cmdk@^1.0.0

# Drag & Drop
npm install @dnd-kit/core@^6.3.1 @dnd-kit/sortable@^10.0.0 @dnd-kit/utilities@^3.2.2

# Form Handling
npm install react-hook-form@^7.51.5 @hookform/resolvers@^3.6.0 zod@^3.23.8

# Backend & API
npm install @supabase/supabase-js@^2.45.6 openai@^4.85.3

# Export & File Handling
npm install exceljs@^4.4.0 pptxgenjs@^3.12.0 html2canvas@^1.4.1 xlsx@^0.18.5

# Date Handling
npm install date-fns@^3.6.0 react-day-picker@^8.10.1

# Development Tools
npm install --save-dev vite@^5.4.14 @vitejs/plugin-react@^4.2.0

# TypeScript & Types
npm install --save-dev typescript@^5.7.3 @types/node@^20.17.19 @types/react@^18.3.18 @types/react-dom@^18.3.5

# CSS Processing
npm install --save-dev postcss@^8.5.2 autoprefixer@^10.4.20

# Tempo-specific
npm install tempo-devtools@^2.0.94

# Serverless Functions
npm install @netlify/functions@^3.0.0 dotenv@^16.4.7

# Animation
npm install framer-motion@^11.18.0 embla-carousel-react@^8.1.5

# UI Component Libraries
npm install react-resizable-panels@^2.0.19


Single Command:
npm install react@^18.2.0 react-dom@^18.2.0 react-router@^6.23.1 react-router-dom@^6.23.1 @radix-ui/react-accordion @radix-ui/react-alert-dialog @radix-ui/react-aspect-ratio @radix-ui/react-avatar @radix-ui/react-checkbox @radix-ui/react-collapsible @radix-ui/react-context-menu @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-hover-card @radix-ui/react-label @radix-ui/react-menubar @radix-ui/react-navigation-menu @radix-ui/react-popover @radix-ui/react-progress @radix-ui/react-radio-group @radix-ui/react-scroll-area @radix-ui/react-select @radix-ui/react-separator @radix-ui/react-slider @radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-toast @radix-ui/react-toggle @radix-ui/react-tooltip tailwindcss@^3.4.1 tailwind-merge@^2.3.0 tailwindcss-animate@^1.0.7 class-variance-authority@^0.7.0 clsx@^2.1.1 lucide-react@^0.394.0 vaul@^0.9.1 cmdk@^1.0.0 @dnd-kit/core@^6.3.1 @dnd-kit/sortable@^10.0.0 @dnd-kit/utilities@^3.2.2 react-hook-form@^7.51.5 @hookform/resolvers@^3.6.0 zod@^3.23.8 @supabase/supabase-js@^2.45.6 openai@^4.85.3 exceljs@^4.4.0 pptxgenjs@^3.12.0 html2canvas@^1.4.1 xlsx@^0.18.5 date-fns@^3.6.0 react-day-picker@^8.10.1 framer-motion@^11.18.0 embla-carousel-react@^8.1.5 react-resizable-panels@^2.0.19 @netlify/functions@^3.0.0 dotenv@^16.4.7 tempo-devtools@^2.0.94 && npm install --save-dev vite@^5.4.14 @vitejs/plugin-react@^4.2.0 typescript@^5.7.3 @types/node@^20.17.19 @types/react@^18.3.18 @types/react-dom@^18.3.5 postcss@^8.5.2 autoprefixer@^10.4.20
