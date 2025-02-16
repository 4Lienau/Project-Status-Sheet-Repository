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