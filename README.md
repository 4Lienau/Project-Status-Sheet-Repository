# Status Sheet - Project Management Dashboard

## Overview
Status Sheet is a modern project management dashboard that enables teams to track project progress, milestones, and key metrics in real-time. Built with React, TypeScript, and Supabase, it provides a comprehensive solution for project status tracking and team collaboration.

## Features

### Project Dashboard
- **Project Health Tracking**
  - Visual health indicators with percentage-based status bars
  - Color-coded status indicators (green, yellow, red)
  - Real-time project health calculations based on milestone completion

### Budget Management
- **Budget Tracking**
  - Actual vs. forecast spending visualization
  - Real-time budget utilization metrics
  - Remaining budget calculations

### Milestone Management
- **Interactive Timeline**
  - Visual milestone progress tracking
  - Completion percentage indicators
  - Owner assignment and tracking
  - Status indicators (completed, on schedule, at risk, high risk)

### Team Collaboration
- **Team Management**
  - Role-based team assignments
  - Team member status tracking
  - Project sponsor and business lead designation

### Status Updates
- **Progress Tracking**
  - Accomplishments logging
  - Next period activity planning
  - Risk and issue tracking
  - Consideration items management

## Technical Stack

### Frontend
- React 18
- TypeScript
- Vite
- TailwindCSS
- Shadcn/ui Components
- Lucide Icons

### Backend
- Supabase
  - Authentication
  - Real-time Database
  - Row Level Security

### Authentication
- Email/Password authentication
- Protected routes
- Secure session management

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation
1. Clone the repository
```bash
git clone <repository-url>
cd status-sheet
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
```
Add your Supabase credentials to the .env file:
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. Start the development server
```bash
npm run dev
```

### Database Setup
The application requires the following Supabase tables:
- projects
- milestones
- accomplishments
- next_period_activities
- risks
- considerations

Refer to the database schema in `src/types/supabase.ts` for detailed table structures.

## Features in Development
- [ ] Export to PDF/Excel
- [ ] Advanced filtering and search
- [ ] Custom dashboard layouts
- [ ] Integration with external project management tools
- [ ] Advanced analytics and reporting

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
