================================
PRODUCT REQUIREMENTS DOCUMENT
================================

Overview: The Project Status Sheet Repository is a modern project management dashboard designed to enable teams to track project progress, milestones, and key metrics in real-time. It offers a centralized, visual solution for monitoring project health, managing budgets, tracking milestones, and fostering team collaboration. The application aims to improve project transparency, accountability, and overall success rates.
Goals: 
  • Increase project completion rates by 15% within the first year of implementation.
  • Reduce project budget overruns by 10% within the first year.
  • Achieve a user satisfaction score of 4.5 out of 5 based on user feedback surveys.
  • Increase team collaboration, measured by a 20% increase in platform engagement.
Personas: 
Name: Sarah Chen, Project Manager
Description: Sarah is a 35-year-old Project Manager with 5+ years of experience. She is responsible for overseeing multiple projects simultaneously and ensuring they are completed on time and within budget. She needs a tool that provides a clear, concise overview of project status, potential risks, and resource allocation. She values real-time updates, clear visualizations, and efficient communication tools.
Name: David Lee, Business Lead
Description: David is a 45-year-old Business Lead responsible for the strategic direction and financial performance of projects. He needs a high-level overview of project health, budget utilization, and potential ROI. He values clear reporting, data-driven insights, and the ability to quickly identify and address potential issues.
Name: Emily Rodriguez, Team Member
Description: Emily is a 28-year-old team member working on various project tasks. She needs a clear understanding of her assignments, deadlines, and project progress. She values easy access to project information, efficient communication channels, and a user-friendly interface.
Features: 
  • Authentication & User Management: Secure user authentication with email/password and Google OAuth, user profile customization, and secure session management.
  • Project Dashboard: Centralized dashboard displaying all projects with key metrics, visual health indicators, and real-time updates.
  • Project Health Tracking: Color-coded status indicators (blue, green, yellow, red) reflecting project health, percentage-based status bars, and version history tracking.
  • Budget Management: Comprehensive budget tracking with total budget overview, actual vs. forecast visualization, real-time budget utilization metrics, and automatic status indicators for budget health.
  • Milestone Management: Interactive timeline displaying project milestones with completion percentage indicators, owner assignment and tracking, and a color-coded status system.
  • Team Collaboration: Team management features including project sponsor designation, business lead assignment, project manager tracking, and role-based access control.
  • Status Updates: Progress tracking with accomplishments logging, next period activity planning, risk and issue tracking, and consideration items management.
  • Report Generation: Export to JPG functionality, shareable project URLs, version comparison, and project duplication.
  • Real-time Database: Enable real-time updates across the application for seamless collaboration.
Mvp: 
  • Authentication & User Management: Microsoft Azure AD
  • Project Dashboard with basic project listing and health indicators
  • Project Health Tracking with color-coded status indicators and percentage-based status bars
  • Milestone Management with basic timeline and completion percentage indicators
  • Status Updates: Progress tracking with accomplishments logging
  • Real-time database functionality for core project data updates.
User Journey: 1. User logs in using email/password or Google OAuth.
2. User is directed to the Project Dashboard, which displays a list of all projects they have access to.
3. User clicks on a specific project to view its detailed status.
4. On the Project Status page, the user can view project health indicators, budget information, milestones, team members, and status updates.
5. User can add new accomplishments, plan next period activities, log risks and issues, and add considerations.
6. Project Managers and Business Leads can update project health, budget information, and assign tasks to team members.
7. Users can export the project status as a JPG or share a URL to the project page.
8. All changes are reflected in real-time for all users with access to the project.
Metrics: 
  • Number of active users
  • Project completion rate
  • Budget variance (actual vs. planned)
  • User satisfaction score (based on surveys)
  • Time spent on the platform per user
  • Frequency of status updates
  • Number of risks and issues identified and resolved
  • Adoption rate of new features

========================================
TECHNICAL REQUIREMENTS DOCUMENT
========================================


====================
TECHSTACK
====================
Frontend: React 18, TypeScript, Vite, TailwindCSS, Shadcn/ui Components, Lucide Icons, React Router v6
Backend: Supabase (Authentication, Real-time Database, Row Level Security)
Hosting: Cloud-based hosting providers such as Vercel, Netlify, AWS Amplify, or Google Firebase Hosting
Misc: Git for version control, npm/yarn for package management

====================
ARCHITECTURE
====================
Components: 
  • Authentication Module (Login, Registration, Password Reset)
  • Project Dashboard Component
  • Project Status Component
  • Budget Management Component
  • Milestone Management Component
  • Team Management Component
  • Status Updates Component
  • Report Generation Component
  • Real-time Update Listener (Supabase Realtime)
Data Flow: 1. User interacts with the Frontend (React components).
2. Frontend sends requests to Supabase API endpoints for authentication, data retrieval, and data updates.
3. Supabase handles authentication and authorizes requests.
4. Supabase Realtime pushes updates to the Frontend in real-time.
5. Frontend updates the UI based on the data received from Supabase.
Security: 
  • Implement Row Level Security (RLS) in Supabase to control data access based on user roles and permissions.
  • Use secure authentication methods (OAuth, Password Hashing).
  • Sanitize user inputs to prevent SQL injection and XSS attacks.
  • Implement rate limiting to prevent brute-force attacks.
  • Regularly update dependencies to patch security vulnerabilities.
  • Store sensitive data (e.g., API keys) securely using environment variables and secret management tools.
  • Enforce strong password policies.
Apis: 
Endpoint: /projects
Methods: GET, POST
Description: Retrieve all projects or create a new project.
Endpoint: /projects/{project_id}
Methods: GET, PUT, DELETE
Description: Retrieve, update, or delete a specific project.
Endpoint: /projects/{project_id}/milestones
Methods: GET, POST
Description: Retrieve all milestones for a project or create a new milestone.
Endpoint: /projects/{project_id}/milestones/{milestone_id}
Methods: GET, PUT, DELETE
Description: Retrieve, update, or delete a specific milestone.
Endpoint: /projects/{project_id}/accomplishments
Methods: GET, POST
Description: Retrieve all accomplishments for a project or create a new accomplishment.
Endpoint: /projects/{project_id}/next_period_activities
Methods: GET, POST
Description: Retrieve all next period activities for a project or create a new activity.
Endpoint: /projects/{project_id}/risks
Methods: GET, POST
Description: Retrieve all risks for a project or create a new risk.
Endpoint: /projects/{project_id}/considerations
Methods: GET, POST
Description: Retrieve all considerations for a project or create a new consideration.

====================
DATABASE
====================
Collections: 
  • projects (id, name, description, start_date, end_date, budget, health_status, project_sponsor, business_lead, project_manager)
  • milestones (id, project_id, name, description, due_date, completed, owner)
  • accomplishments (id, project_id, description, date)
  • next_period_activities (id, project_id, description, due_date)
  • risks (id, project_id, description, severity, status)
  • considerations (id, project_id, description, status)
  • project_versions (id, project_id, version_number, timestamp, data)
Relationships: One-to-many relationship between projects and milestones, accomplishments, next_period_activities, risks, considerations, and project_versions.  Each milestone, accomplishment, activity, risk, consideration, and version belongs to one project.

========================================
UI DESIGN GUIDELINES
========================================

Screens: 
  • Login/Registration
  • Project Dashboard
  • Project Edit Page
  • Project Status Page
  • User Profile
  • Admin Panel (optional)
Components: 
  • Navigation Bar
  • Project Card
  • Status Indicator
  • Progress Bar
  • Timeline Component
  • Table Component
  • Form Component
  • Button Component
  • Alert/Notification Component
  • Modal Component

====================
DESIGNSYSTEM
====================
Colors: Primary: #2563EB (blue), Secondary: #6B7280 (gray), Accent: #F59E0B (amber), Success: #16A34A (green), Error: #DC2626 (red), Background: #F9FAFB (light gray), Text: #111827 (dark gray)
Typography: Font Family: Inter, Font Sizes: 12px, 14px, 16px, 18px, 20px, 24px, Font Weights: 400, 500, 600, 700
Spacing: Spacing Scale: 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px
Components: Component Styling: Use rounded corners, subtle shadows, and consistent padding. Maintain a clean and minimalist design. Use Shadcn/ui components for consistent styling and accessibility. Focus on readability and visual hierarchy.
User Experience: 
  • Prioritize clear and concise information display.
  • Use visual cues (colors, icons) to highlight important information.
  • Ensure easy navigation and intuitive workflows.
  • Provide real-time feedback to user actions.
  • Optimize for mobile responsiveness.
  • Incorporate accessibility best practices (e.g., ARIA attributes, keyboard navigation).
Tone: 
  • Professional, clear, and concise.
  • Empathetic and supportive.
  • Data-driven and results-oriented.
  • Collaborative and encouraging.
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

========================================
NO-CODE PROMPT
========================================

Prompt: Build a project management dashboard that allows teams to track project progress, milestones, and key metrics in real-time. The application should include the following features:

**Authentication & User Management:**
*   Allow users to sign up and log in using email/password and Google OAuth.
*   Enable user profile customization (name, email, etc.).
*   Implement secure session management.

**Project Dashboard:**
*   Display a list of all projects the user has access to.
*   Show key metrics for each project (e.g., project health, budget utilization, completion percentage).
*   Use visual health indicators (color-coded statuses: blue, green, yellow, red) to represent project health.
*   Include percentage-based status bars to visually represent project progress.

**Project Status Page:**
*   Display detailed information for a specific project.
*   Include project health indicators, budget information, milestones, team members, and status updates.

**Budget Management:**
*   Track the total project budget.
*   Visualize actual vs. forecast spending.
*   Display real-time budget utilization metrics.
*   Use automatic status indicators to reflect budget health.

**Milestone Management:**
*   Display an interactive timeline of project milestones.
*   Show completion percentage indicators for each milestone.
*   Allow assignment of owners to milestones.
*   Use a color-coded status system for milestones.

**Team Collaboration:**
*   Allow designation of project sponsors, business leads, and project managers.
*   Implement role-based access control to restrict access to certain features based on user roles.

**Status Updates:**
*   Enable users to log accomplishments, plan next period activities, track risks and issues, and add consideration items.

**Report Generation:**
*   Allow users to export project status as a JPG image.
*   Generate shareable URLs to project pages.
*   Provide version comparison functionality to compare different project versions.
*   Allow project duplication.

**Design:**
*   Use a clean and modern design with the Inter font family.
*   Use the following color palette: Primary: #2563EB (blue), Secondary: #6B7280 (gray), Accent: #F59E0B (amber), Success: #16A34A (green), Error: #DC2626 (red), Background: #F9FAFB (light gray), Text: #111827 (dark gray).
*   Use rounded corners and subtle shadows for components.
*   Maintain consistent spacing and padding throughout the application.

**Data Structure:**
*   Create a table for `projects` with columns for: id, name, description, start_date, end_date, budget, health_status, project_sponsor, business_lead, project_manager.
*   Create a table for `milestones` with columns for: id, project_id, name, description, due_date, completed, owner.
*   Create a table for `accomplishments` with columns for: id, project_id, description, date.
*   Create a table for `next_period_activities` with columns for: id, project_id, description, due_date.
*   Create a table for `risks` with columns for: id, project_id, description, severity, status.
*   Create a table for `considerations` with columns for: id, project_id, description, status.
*   Create a table for `project_versions` with columns for: id, project_id, version_number, timestamp, data.

Ensure the application updates project metrics and statuses in real-time.

