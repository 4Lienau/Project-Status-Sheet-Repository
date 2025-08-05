# API Reference

This document provides comprehensive API reference for the Project Status Sheet Repository, including Supabase database operations, custom functions, and service interfaces.

## Database API

### Projects API

#### Get All Projects
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

#### Get Project by ID
```typescript
const { data: project, error } = await supabase
  .from('projects')
  .select(`
    *,
    milestones(*),
    accomplishments(*),
    next_period_activities(*),
    risks(*),
    considerations(*),
    changes(*)
  `)
  .eq('id', projectId)
  .single();
```

#### Create Project
```typescript
const { data, error } = await supabase
  .from('projects')
  .insert({
    title: string,
    description?: string,
    project_manager: string,
    business_leads: string,
    sponsors: string,
    charter_link: string,
    value_statement?: string,
    department?: string,
    budget_total?: number,
    budget_actuals: number,
    budget_forecast: number,
    health_calculation_type?: 'milestone_based' | 'manual',
    manual_health_percentage?: number,
    manual_status_color?: 'red' | 'yellow' | 'green'
  })
  .select()
  .single();
```

#### Update Project
```typescript
const { data, error } = await supabase
  .from('projects')
  .update({
    title?: string,
    description?: string,
    budget_actuals?: number,
    budget_forecast?: number,
    manual_health_percentage?: number,
    manual_status_color?: 'red' | 'yellow' | 'green',
    project_analysis?: string
  })
  .eq('id', projectId)
  .select();
```

#### Delete Project
```typescript
const { error } = await supabase
  .from('projects')
  .delete()
  .eq('id', projectId);
```

### Milestones API

#### Get Milestones for Project
```typescript
const { data: milestones, error } = await supabase
  .from('milestones')
  .select('*, tasks(*)')
  .eq('project_id', projectId)
  .order('date', { ascending: true });
```

#### Create Milestone
```typescript
const { data, error } = await supabase
  .from('milestones')
  .insert({
    project_id: string,
    milestone: string,
    completion: number, // 0-100
    status: 'on-schedule' | 'at-risk' | 'high-risk' | 'completed',
    owner: string,
    date: string, // ISO date string
    weight?: number // 1-5, defaults to 3
  })
  .select()
  .single();
```

#### Update Milestone
```typescript
const { data, error } = await supabase
  .from('milestones')
  .update({
    milestone?: string,
    completion?: number,
    status?: 'on-schedule' | 'at-risk' | 'high-risk' | 'completed',
    owner?: string,
    date?: string,
    weight?: number
  })
  .eq('id', milestoneId)
  .select();
```

#### Delete Milestone
```typescript
const { error } = await supabase
  .from('milestones')
  .delete()
  .eq('id', milestoneId);
```

### Accomplishments API

#### Get Accomplishments for Project
```typescript
const { data: accomplishments, error } = await supabase
  .from('accomplishments')
  .select('*')
  .eq('project_id', projectId)
  .order('created_at', { ascending: false });
```

#### Create Accomplishment
```typescript
const { data, error } = await supabase
  .from('accomplishments')
  .insert({
    project_id: string,
    accomplishment: string,
    description: string
  })
  .select()
  .single();
```

#### Update Accomplishment
```typescript
const { data, error } = await supabase
  .from('accomplishments')
  .update({
    accomplishment?: string,
    description?: string
  })
  .eq('id', accomplishmentId)
  .select();
```

#### Delete Accomplishment
```typescript
const { error } = await supabase
  .from('accomplishments')
  .delete()
  .eq('id', accomplishmentId);
```

### Next Period Activities API

#### Get Activities for Project
```typescript
const { data: activities, error } = await supabase
  .from('next_period_activities')
  .select('*')
  .eq('project_id', projectId)
  .order('date', { ascending: true });
```

#### Create Activity
```typescript
const { data, error } = await supabase
  .from('next_period_activities')
  .insert({
    project_id: string,
    description: string,
    date?: string,
    assignee?: string,
    completion?: number // 0-100
  })
  .select()
  .single();
```

#### Update Activity
```typescript
const { data, error } = await supabase
  .from('next_period_activities')
  .update({
    description?: string,
    date?: string,
    assignee?: string,
    completion?: number
  })
  .eq('id', activityId)
  .select();
```

### Risks API

#### Get Risks for Project
```typescript
const { data: risks, error } = await supabase
  .from('risks')
  .select('*')
  .eq('project_id', projectId)
  .order('created_at', { ascending: false });
```

#### Create Risk
```typescript
const { data, error } = await supabase
  .from('risks')
  .insert({
    project_id: string,
    description: string,
    impact?: 'low' | 'medium' | 'high'
  })
  .select()
  .single();
```

### Considerations API

#### Get Considerations for Project
```typescript
const { data: considerations, error } = await supabase
  .from('considerations')
  .select('*')
  .eq('project_id', projectId)
  .order('created_at', { ascending: false });
```

#### Create Consideration
```typescript
const { data, error } = await supabase
  .from('considerations')
  .insert({
    project_id: string,
    description: string,
    impact?: 'low' | 'medium' | 'high'
  })
  .select()
  .single();
```

### Tasks API

#### Get Tasks for Milestone
```typescript
const { data: tasks, error } = await supabase
  .from('tasks')
  .select('*')
  .eq('milestone_id', milestoneId)
  .order('date', { ascending: true });
```

#### Create Task
```typescript
const { data, error } = await supabase
  .from('tasks')
  .insert({
    project_id: string,
    milestone_id: string,
    description: string,
    assignee?: string,
    date?: string,
    completion?: number // 0-100
  })
  .select()
  .single();
```

## Custom Database Functions

### Analytics Functions

#### Get User Activity Summary
```sql
SELECT * FROM get_user_activity_summary();
```

Returns comprehensive user activity metrics:
```typescript
interface UserActivitySummary {
  user_id: string;
  email: string;
  full_name: string;
  total_session_time: number; // minutes
  total_page_views: number;
  total_projects: number;
  login_count: number;
  last_login: string;
  account_created: string;
}
```

#### Get AI Usage Analytics
```sql
SELECT * FROM get_ai_usage_analytics();
```

Returns AI feature usage statistics:
```typescript
interface AIUsageAnalytics {
  feature_type: string;
  total_usage: number;
  unique_users: number;
  usage_last_7_days: number;
  usage_last_30_days: number;
  avg_daily_usage: number;
}
```

#### Get Project Creation Stats
```sql
SELECT * FROM get_project_creation_stats();
```

Returns project creation metrics:
```typescript
interface ProjectCreationStats {
  total_projects_created: number;
  unique_project_creators: number;
  projects_created_last_7_days: number;
  projects_created_last_30_days: number;
}
```

#### Get Active Users
```sql
SELECT * FROM get_active_users();
```

Returns currently active users:
```typescript
interface ActiveUser {
  user_id: string;
  email: string;
  full_name: string;
  session_start: string;
  last_activity: string;
  session_duration_minutes: number;
}
```

### Project Management Functions

#### Update Project Computed Status Color
```sql
SELECT update_project_computed_status_color('project-id');
```

Automatically calculates and updates the computed status color based on milestone completion and health metrics.

#### Recalculate All Computed Status Colors
```sql
SELECT recalculate_all_computed_status_colors();
```

Batch operation to recalculate status colors for all projects.

#### Get Version Count
```sql
SELECT get_version_count('project-id');
```

Returns the number of versions stored for a specific project.

### Utility Functions

#### Get Database Size
```sql
SELECT get_database_size();
```

Returns the total database size in bytes.

#### Get Table Sizes
```sql
SELECT * FROM get_table_sizes();
```

Returns size information for all tables:
```typescript
interface TableSize {
  table_name: string;
  size_bytes: number;
  size_mb: number;
  row_count: number;
}
```

## Real-time Subscriptions

### Project Updates
```typescript
const projectSubscription = supabase
  .channel('project-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'projects'
  }, (payload) => {
    console.log('Project updated:', payload);
    // Handle real-time project updates
    if (payload.eventType === 'UPDATE') {
      updateProjectInState(payload.new);
    }
  })
  .subscribe();
```

### Milestone Updates
```typescript
const milestoneSubscription = supabase
  .channel('milestone-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'milestones',
    filter: `project_id=eq.${projectId}`
  }, (payload) => {
    console.log('Milestone updated:', payload);
    // Handle real-time milestone updates
    updateMilestonesInState(payload);
  })
  .subscribe();
```

### Chat Messages
```typescript
const chatSubscription = supabase
  .channel('chat-messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'chat_messages',
    filter: `conversation_id=eq.${conversationId}`
  }, (payload) => {
    console.log('New message:', payload);
    addMessageToChat(payload.new);
  })
  .subscribe();
```

## Authentication API

### Sign Up
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword',
  options: {
    data: {
      full_name: 'User Name',
      department: 'Engineering'
    }
  }
});
```

### Sign In
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securepassword'
});
```

### OAuth Sign In
```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`
  }
});
```

### Get Current User
```typescript
const { data: { user }, error } = await supabase.auth.getUser();
```

### Sign Out
```typescript
const { error } = await supabase.auth.signOut();
```

### Update Profile
```typescript
const { data, error } = await supabase
  .from('profiles')
  .update({
    full_name: 'Updated Name',
    department: 'New Department',
    avatar_url: 'https://example.com/avatar.jpg'
  })
  .eq('id', user.id);
```

## Service Layer APIs

### Project Service

#### calculateWeightedCompletion
```typescript
import { calculateWeightedCompletion } from '@/lib/services/project';

const completionPercentage = calculateWeightedCompletion(milestones);
// Returns: number (0-100)
```

Calculates weighted completion percentage based on milestone completion and weights.

#### calculateProjectDuration
```typescript
import { calculateProjectDuration } from '@/lib/services/project';

const duration = calculateProjectDuration(milestones);
// Returns: {
//   startDate: string | null,
//   endDate: string | null,
//   totalDays: number | null,
//   workingDays: number | null,
//   totalDaysRemaining: number | null,
//   workingDaysRemaining: number | null
// }
```

### AI Service

#### generateProjectDescription
```typescript
import { generateProjectDescription } from '@/lib/services/aiService';

const description = await generateProjectDescription(projectTitle, context);
// Returns: Promise<string>
```

#### generateValueStatement
```typescript
import { generateValueStatement } from '@/lib/services/aiService';

const valueStatement = await generateValueStatement(projectData);
// Returns: Promise<string>
```

#### generateMilestones
```typescript
import { generateMilestones } from '@/lib/services/aiService';

const milestones = await generateMilestones(projectDescription, projectDuration);
// Returns: Promise<Milestone[]>
```

### Export Services

#### exportToExcel
```typescript
import { exportToExcel } from '@/lib/services/excelExport';

await exportToExcel(projectData, filename);
// Triggers download of Excel file
```

#### exportToPowerPoint
```typescript
import { exportToPowerPoint } from '@/lib/services/pptExport';

await exportToPowerPoint(projectData, filename);
// Triggers download of PowerPoint file
```

### Admin Service

#### getUserAnalytics
```typescript
import { getUserAnalytics } from '@/lib/services/adminService';

const analytics = await getUserAnalytics();
// Returns: Promise<UserAnalytics[]>
```

#### getDepartments
```typescript
import { getDepartments } from '@/lib/services/adminService';

const departments = await getDepartments();
// Returns: Promise<Department[]>
```

## Error Handling

### Database Errors
```typescript
const { data, error } = await supabase
  .from('projects')
  .select('*');

if (error) {
  console.error('Database error:', error.message);
  // Handle specific error types
  switch (error.code) {
    case 'PGRST116':
      // No rows returned
      break;
    case '23505':
      // Unique constraint violation
      break;
    default:
      // Generic error handling
  }
}
```

### Authentication Errors
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
});

if (error) {
  switch (error.message) {
    case 'Invalid login credentials':
      // Handle invalid credentials
      break;
    case 'Email not confirmed':
      // Handle unconfirmed email
      break;
    default:
      // Generic auth error
  }
}
```

### API Rate Limits
```typescript
const { data, error } = await supabase
  .from('projects')
  .select('*');

if (error && error.message.includes('rate limit')) {
  // Implement exponential backoff
  setTimeout(() => {
    // Retry request
  }, 1000);
}
```

## Best Practices

### Batch Operations
```typescript
// Instead of multiple individual inserts
const { data, error } = await supabase
  .from('milestones')
  .insert([
    { project_id, milestone: 'Milestone 1', ... },
    { project_id, milestone: 'Milestone 2', ... },
    { project_id, milestone: 'Milestone 3', ... }
  ]);
```

### Optimistic Updates
```typescript
// Update UI immediately, revert on error
const optimisticUpdate = { ...milestone, completion: newCompletion };
setMilestones(prev => prev.map(m => 
  m.id === milestone.id ? optimisticUpdate : m
));

const { error } = await supabase
  .from('milestones')
  .update({ completion: newCompletion })
  .eq('id', milestone.id);

if (error) {
  // Revert optimistic update
  setMilestones(prev => prev.map(m => 
    m.id === milestone.id ? milestone : m
  ));
}
```

### Connection Cleanup
```typescript
useEffect(() => {
  const subscription = supabase
    .channel('project-updates')
    .on('postgres_changes', { ... }, handler)
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

---

*This API reference is generated from the current codebase and database schema. For the most up-to-date information, refer to the TypeScript types in `src/types/supabase.ts`.*