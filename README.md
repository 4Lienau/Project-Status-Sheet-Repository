# Project Status Sheet Repository Documentation

## Overview

The Project Status Sheet Repository is a comprehensive project management platform built with React 18, TypeScript, and Supabase. It provides real-time project tracking, milestone management, budget monitoring, and team collaboration features designed to improve project success rates and team productivity.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Getting Started](#getting-started)
3. [Project Structure](#project-structure)
4. [Database Schema](#database-schema)
5. [API Reference](#api-reference)
6. [Component Library](#component-library)
7. [Services](#services)
8. [Authentication](#authentication)
9. [Deployment](#deployment)
10. [Contributing](#contributing)

## Architecture Overview

### Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Framework**: TailwindCSS, Shadcn/ui Components
- **Backend**: Supabase (PostgreSQL, Authentication, Real-time)
- **Icons**: Lucide React
- **Routing**: React Router v6
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts
- **Export**: ExcelJS, PptxGenJS, HTML2Canvas

### Key Features

- **Real-time Project Tracking**: Live updates across all connected clients
- **Milestone Management**: Weighted milestone system with completion tracking
- **Budget Monitoring**: Actual vs. forecast budget tracking
- **Team Collaboration**: Role-based access control and team assignments
- **AI Integration**: OpenAI-powered project insights and chat assistant
- **Export Capabilities**: Excel, PowerPoint, and image export functionality
- **Analytics**: Comprehensive usage and performance metrics

## Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager
- Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd project-status-sheet-repository
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Configure the following variables:
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `VITE_OPENAI_API_KEY`: OpenAI API key for AI features

4. Start the development server:
```bash
npm run dev
```

### Build Commands

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build
- `npm run lint`: Run ESLint
- `npm run types:supabase`: Generate TypeScript types from Supabase

## Project Structure

```
src/
├── components/           # React components
│   ├── admin/           # Admin-specific components
│   ├── auth/            # Authentication components
│   ├── chat/            # Chat/AI assistant components
│   ├── dashboard/       # Dashboard and project overview
│   ├── form/            # Form components and sections
│   ├── landing/         # Landing page components
│   ├── layout/          # Layout components (Navbar, Footer)
│   ├── projects/        # Project listing and management
│   ├── providers/       # Context providers
│   ├── ui/              # Reusable UI components (Shadcn/ui)
│   └── welcome/         # Welcome page components
├── lib/
│   ├── hooks/           # Custom React hooks
│   ├── services/        # Business logic and API services
│   ├── utils/           # Utility functions
│   └── supabase.ts      # Supabase client configuration
├── pages/               # Page components
├── stories/             # Storybook stories (UI documentation)
├── types/               # TypeScript type definitions
└── main.tsx             # Application entry point
```

## Database Schema

### Core Tables

#### projects
Primary project entity with comprehensive tracking fields:
- **Basic Info**: `title`, `description`, `department`
- **Team**: `project_manager`, `business_leads`, `sponsors`
- **Budget**: `budget_total`, `budget_actuals`, `budget_forecast`
- **Status**: `manual_status_color`, `computed_status_color`, `health_calculation_type`
- **Timeline**: `calculated_start_date`, `calculated_end_date`, `total_days`, `working_days`

#### milestones
Project milestones with weighted completion tracking:
- **Content**: `milestone`, `completion`, `status`, `owner`
- **Timeline**: `date`
- **Weighting**: `weight` (1-5 scale for priority)

#### accomplishments
Project achievements and completed work:
- **Content**: `accomplishment`, `description`
- **Tracking**: Linked to project via `project_id`

#### next_period_activities
Planned activities for upcoming periods:
- **Content**: `description`, `assignee`, `completion`
- **Timeline**: `date`

#### risks & considerations
Risk management and consideration tracking:
- **Content**: `description`, `impact`
- **Status**: Risk severity and consideration status

### Analytics Tables

#### usage_metrics
User activity and engagement tracking:
- **Activity**: `login_count`, `page_views`, `total_session_time_minutes`
- **Creation**: `projects_created`, `milestones_created`

#### ai_usage_tracking
AI service usage monitoring:
- **Features**: `feature_type` (description, milestones, chat, etc.)
- **Context**: `project_id`, `session_id`, `metadata`

### Authentication & User Management

#### profiles
Extended user profile information:
- **Identity**: `full_name`, `email`, `avatar_url`
- **Organization**: `department`, `is_approved`

#### directory_users
Azure AD synchronization for enterprise users:
- **Azure**: `azure_user_id`, `user_principal_name`
- **Sync**: `last_synced`, `sync_status`

## API Reference

### Project Operations

#### Get Projects
```typescript
const { data: projects, error } = await supabase
  .from('projects')
  .select(`
    *,
    milestones(*),
    accomplishments(*),
    next_period_activities(*),
    risks(*),
    considerations(*)
  `);
```

#### Create Project
```typescript
const { data, error } = await supabase
  .from('projects')
  .insert({
    title: 'New Project',
    description: 'Project description',
    project_manager: 'manager@example.com',
    business_leads: 'lead@example.com',
    sponsors: 'sponsor@example.com',
    budget_total: 100000,
    budget_actuals: 0,
    budget_forecast: 100000
  });
```

#### Update Project Status
```typescript
const { error } = await supabase
  .from('projects')
  .update({
    manual_status_color: 'green',
    manual_health_percentage: 85
  })
  .eq('id', projectId);
```

### Milestone Management

#### Create Milestone
```typescript
const { data, error } = await supabase
  .from('milestones')
  .insert({
    project_id: projectId,
    milestone: 'Phase 1 Complete',
    completion: 0,
    status: 'on-schedule',
    owner: 'owner@example.com',
    date: '2024-12-31',
    weight: 3
  });
```

#### Update Milestone Progress
```typescript
const { error } = await supabase
  .from('milestones')
  .update({
    completion: 75,
    status: 'on-schedule'
  })
  .eq('id', milestoneId);
```

### Real-time Subscriptions

#### Project Updates
```typescript
const subscription = supabase
  .channel('project-changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'projects' },
    (payload) => {
      console.log('Project updated:', payload);
    }
  )
  .subscribe();
```

### Analytics Functions

#### Get User Activity Summary
```sql
SELECT * FROM get_user_activity_summary();
```

#### Get AI Usage Analytics
```sql
SELECT * FROM get_ai_usage_analytics();
```

## Component Library

### Core UI Components (Shadcn/ui)

Located in `src/components/ui/`, these components provide the foundation for the application's interface:

- **Navigation**: `button`, `navigation-menu`, `menubar`
- **Forms**: `input`, `textarea`, `select`, `checkbox`, `radio-group`
- **Data Display**: `table`, `card`, `badge`, `progress`
- **Feedback**: `alert`, `toast`, `dialog`, `sheet`
- **Layout**: `separator`, `tabs`, `accordion`, `collapsible`

### Business Components

#### ProjectForm (`src/components/form/`)
Comprehensive project creation and editing interface with:
- Project details section
- Budget management
- Milestone creation with AI assistance
- Team assignment
- Status tracking

#### Dashboard Components (`src/components/dashboard/`)
- **ProjectOverview**: High-level project metrics
- **MilestoneBoard**: Kanban-style milestone tracking
- **GanttChart**: Timeline visualization
- **BudgetTracker**: Budget vs. actual spending

#### Chat Components (`src/components/chat/`)
- **ProjectPilot**: AI-powered project assistant
- Context-aware suggestions
- Natural language project queries

## Services

### Core Services (`src/lib/services/`)

#### project.ts
Primary project management service with:
- CRUD operations for projects and related entities
- Weighted completion calculations
- Project duration analysis
- Status color computation

#### aiService.ts
OpenAI integration for:
- Project description generation
- Milestone suggestions
- Value statement creation
- Natural language processing

#### adminService.ts
Administrative functions:
- User management
- Department management
- System analytics
- Usage tracking

#### Export Services
- **excelExport.ts**: Excel spreadsheet generation
- **pptExport.ts**: PowerPoint presentation creation
- Image export via HTML2Canvas

## Authentication

### Supabase Authentication

The application uses Supabase Auth with:
- **Email/Password**: Standard authentication
- **OAuth**: Google, Microsoft Azure AD
- **Row Level Security**: Database-level access control

### User Flow

1. **Registration**: Users create accounts or are synchronized from Azure AD
2. **Profile Setup**: Complete profile information and department assignment
3. **Approval**: Admin approval required for access
4. **Role Assignment**: Users inherit permissions based on project assignments

### Row Level Security Policies

```sql
-- Projects: Users can only see projects in their department
CREATE POLICY "Users can view projects in their department" ON projects
FOR SELECT USING (
  department = (SELECT department FROM profiles WHERE id = auth.uid())
);

-- Milestones: Access through project relationship
CREATE POLICY "Users can manage milestones for accessible projects" ON milestones
FOR ALL USING (
  project_id IN (
    SELECT id FROM projects WHERE department = (
      SELECT department FROM profiles WHERE id = auth.uid()
    )
  )
);
```

## Deployment

### Environment Configuration

#### Production Environment Variables
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_OPENAI_API_KEY=sk-your-openai-key
```

### Netlify Deployment

The application is configured for Netlify deployment with:
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Serverless Functions**: Located in `netlify/functions/`

#### Netlify Functions
- **generate-content.ts**: AI content generation endpoint
- Handles OpenAI API calls with proper CORS headers

### Database Migrations

Supabase migrations are located in `supabase/migrations/`:
- **Schema Changes**: Table creation and modifications
- **RLS Policies**: Row-level security implementations
- **Functions**: Custom PostgreSQL functions
- **Triggers**: Automated database operations

### Performance Optimizations

1. **Code Splitting**: Vite automatically splits code by routes
2. **Lazy Loading**: Components loaded on-demand
3. **Database Indexing**: Optimized queries with proper indexes
4. **Caching**: Supabase client-side caching
5. **Image Optimization**: Compressed assets in `public/images/`

## Contributing

### Development Workflow

1. **Branch Strategy**: Feature branches from `main`
2. **Code Standards**: ESLint configuration with TypeScript
3. **Testing**: Component testing with Storybook
4. **Documentation**: Update relevant documentation with changes

### Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier configuration
- **Linting**: ESLint with React and TypeScript rules
- **Components**: Functional components with hooks

### Database Changes

1. Create migration files in `supabase/migrations/`
2. Update TypeScript types: `npm run types:supabase`
3. Test migrations in development environment
4. Document schema changes in this README

### Adding New Features

1. **Components**: Follow existing component structure
2. **Services**: Add business logic to appropriate service files
3. **Types**: Update TypeScript definitions
4. **Documentation**: Add to relevant documentation sections

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- **Issues**: Open GitHub issues for bugs and feature requests
- **Documentation**: Refer to inline code documentation
- **Database**: Supabase dashboard for data management

---

*Last updated: January 2025*