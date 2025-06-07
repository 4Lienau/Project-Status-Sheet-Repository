/**
 * File: aiUsageTrackingService.ts
 * Purpose: Service for tracking AI feature usage
 * Description: This service provides functions for logging AI usage events and retrieving
 * AI usage analytics for the admin dashboard. It tracks usage of AI features like
 * description generation, value statement creation, milestone suggestions, and Project Pilot.
 *
 * Imports from:
 * - Supabase client
 * - Auth hooks
 *
 * Used by:
 * - src/lib/services/aiService.ts
 * - src/components/admin/AIUsageAnalytics.tsx
 * - Project Pilot components
 */

import { supabase } from "../supabase";

export type AIFeatureType =
  | "description"
  | "value_statement"
  | "milestones"
  | "project_pilot";

export interface AIUsageEvent {
  user_id: string;
  feature_type: AIFeatureType;
  project_id?: string;
  session_id?: string;
  metadata?: Record<string, any>;
}

export interface AIUsageAnalytics {
  feature_type: string;
  total_usage: number;
  unique_users: number;
  usage_last_7_days: number;
  usage_last_30_days: number;
  avg_daily_usage: number;
}

export interface AIUsageTrend {
  date: string;
  feature_type: string;
  usage_count: number;
}

export interface TopAIUser {
  user_id: string;
  email: string;
  full_name: string;
  total_ai_usage: number;
  description_usage: number;
  value_statement_usage: number;
  milestones_usage: number;
  project_pilot_usage: number;
  last_ai_usage: string;
}

export const aiUsageTrackingService = {
  /**
   * Log an AI usage event
   */
  async logAIUsage(event: AIUsageEvent): Promise<boolean> {
    try {
      console.log(`[aiUsageTrackingService] Logging AI usage:`, {
        feature_type: event.feature_type,
        user_id: event.user_id,
        project_id: event.project_id,
        timestamp: new Date().toISOString(),
      });

      const { error } = await supabase.from("ai_usage_tracking").insert({
        user_id: event.user_id,
        feature_type: event.feature_type,
        project_id: event.project_id || null,
        session_id: event.session_id || null,
        metadata: event.metadata || {},
      });

      if (error) {
        console.error(
          `[aiUsageTrackingService] Error logging AI usage:`,
          error,
        );
        return false;
      }

      console.log(
        `[aiUsageTrackingService] Successfully logged AI usage for feature: ${event.feature_type}`,
      );
      return true;
    } catch (error) {
      console.error(
        `[aiUsageTrackingService] Catch error logging AI usage:`,
        error,
      );
      return false;
    }
  },

  /**
   * Get AI usage analytics summary
   */
  async getAIUsageAnalytics(): Promise<AIUsageAnalytics[]> {
    try {
      console.log(`[aiUsageTrackingService] Fetching AI usage analytics...`);

      const { data, error } = await supabase.rpc("get_ai_usage_analytics");

      if (error) {
        console.error(
          `[aiUsageTrackingService] Error fetching AI usage analytics:`,
          error,
        );
        return [];
      }

      console.log(
        `[aiUsageTrackingService] Successfully fetched AI usage analytics:`,
        data?.length || 0,
        "records",
      );
      return data || [];
    } catch (error) {
      console.error(
        `[aiUsageTrackingService] Catch error fetching AI usage analytics:`,
        error,
      );
      return [];
    }
  },

  /**
   * Get AI usage trends over time
   */
  async getAIUsageTrends(daysBack: number = 30): Promise<AIUsageTrend[]> {
    try {
      console.log(
        `[aiUsageTrackingService] Fetching AI usage trends for last ${daysBack} days...`,
      );

      const { data, error } = await supabase.rpc("get_ai_usage_trends", {
        days_back: daysBack,
      });

      if (error) {
        console.error(
          `[aiUsageTrackingService] Error fetching AI usage trends:`,
          error,
        );
        return [];
      }

      console.log(
        `[aiUsageTrackingService] Successfully fetched AI usage trends:`,
        data?.length || 0,
        "records",
      );
      return data || [];
    } catch (error) {
      console.error(
        `[aiUsageTrackingService] Catch error fetching AI usage trends:`,
        error,
      );
      return [];
    }
  },

  /**
   * Get top AI users
   */
  async getTopAIUsers(limit: number = 10): Promise<TopAIUser[]> {
    try {
      console.log(`[aiUsageTrackingService] Fetching top ${limit} AI users...`);

      const { data, error } = await supabase.rpc("get_top_ai_users", {
        limit_count: limit,
      });

      if (error) {
        console.error(
          `[aiUsageTrackingService] Error fetching top AI users:`,
          error,
        );
        return [];
      }

      console.log(
        `[aiUsageTrackingService] Successfully fetched top AI users:`,
        data?.length || 0,
        "records",
      );
      return data || [];
    } catch (error) {
      console.error(
        `[aiUsageTrackingService] Catch error fetching top AI users:`,
        error,
      );
      return [];
    }
  },

  /**
   * Get AI usage statistics for a specific user
   */
  async getUserAIUsageStats(userId: string): Promise<{
    total_usage: number;
    usage_by_feature: Record<AIFeatureType, number>;
    recent_usage: any[];
  }> {
    try {
      console.log(
        `[aiUsageTrackingService] Fetching AI usage stats for user:`,
        userId,
      );

      // Get total usage and breakdown by feature
      const { data: usageData, error: usageError } = await supabase
        .from("ai_usage_tracking")
        .select("feature_type, created_at, project_id, metadata")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (usageError) {
        console.error(
          `[aiUsageTrackingService] Error fetching user AI usage stats:`,
          usageError,
        );
        return {
          total_usage: 0,
          usage_by_feature: {
            description: 0,
            value_statement: 0,
            milestones: 0,
            project_pilot: 0,
          },
          recent_usage: [],
        };
      }

      const usageByFeature = {
        description: 0,
        value_statement: 0,
        milestones: 0,
        project_pilot: 0,
      };

      usageData?.forEach((usage) => {
        if (usage.feature_type in usageByFeature) {
          usageByFeature[usage.feature_type as AIFeatureType]++;
        }
      });

      console.log(
        `[aiUsageTrackingService] Successfully fetched user AI usage stats:`,
        {
          total_usage: usageData?.length || 0,
          usage_by_feature: usageByFeature,
        },
      );

      return {
        total_usage: usageData?.length || 0,
        usage_by_feature: usageByFeature,
        recent_usage: usageData?.slice(0, 10) || [],
      };
    } catch (error) {
      console.error(
        `[aiUsageTrackingService] Catch error fetching user AI usage stats:`,
        error,
      );
      return {
        total_usage: 0,
        usage_by_feature: {
          description: 0,
          value_statement: 0,
          milestones: 0,
          project_pilot: 0,
        },
        recent_usage: [],
      };
    }
  },

  /**
   * Get AI adoption metrics
   */
  async getAIAdoptionMetrics(): Promise<{
    total_users_with_ai_usage: number;
    total_ai_events: number;
    adoption_rate: number;
    most_popular_feature: string;
    least_popular_feature: string;
    daily_average_usage: number;
  }> {
    try {
      console.log(
        `[aiUsageTrackingService] Calculating AI adoption metrics...`,
      );

      // Use the new database function for accurate metrics
      const { data, error } = await supabase.rpc("get_ai_adoption_overview");

      if (error) {
        console.error(
          `[aiUsageTrackingService] Error fetching adoption overview:`,
          error,
        );
        // Fallback to manual calculation
        return this.calculateAdoptionMetricsManually();
      }

      if (!data || data.length === 0) {
        console.warn(
          `[aiUsageTrackingService] No adoption data returned from database function`,
        );
        return this.calculateAdoptionMetricsManually();
      }

      const result = data[0];
      const analytics = await this.getAIUsageAnalytics();
      const leastPopular =
        analytics.length > 0 ? analytics[analytics.length - 1] : null;

      const metrics = {
        total_users_with_ai_usage: result.unique_ai_users || 0,
        total_ai_events: result.total_ai_events || 0,
        adoption_rate: result.adoption_rate || 0,
        most_popular_feature: result.most_popular_feature || "None",
        least_popular_feature: leastPopular?.feature_type || "None",
        daily_average_usage: result.daily_average_usage || 0,
      };

      console.log(
        `[aiUsageTrackingService] Successfully calculated AI adoption metrics:`,
        metrics,
      );
      return metrics;
    } catch (error) {
      console.error(
        `[aiUsageTrackingService] Catch error calculating AI adoption metrics:`,
        error,
      );
      return this.calculateAdoptionMetricsManually();
    }
  },

  // Fallback method for manual calculation
  async calculateAdoptionMetricsManually(): Promise<{
    total_users_with_ai_usage: number;
    total_ai_events: number;
    adoption_rate: number;
    most_popular_feature: string;
    least_popular_feature: string;
    daily_average_usage: number;
  }> {
    try {
      // Get total users count
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Get unique AI users (no double counting)
      const { data: uniqueUsersData } = await supabase
        .from("ai_usage_tracking")
        .select("user_id")
        .group("user_id");

      const totalUsersWithAIUsage = uniqueUsersData?.length || 0;

      // Get total AI events
      const { count: totalAIEvents } = await supabase
        .from("ai_usage_tracking")
        .select("*", { count: "exact", head: true });

      const adoptionRate = totalUsers
        ? Math.round((totalUsersWithAIUsage / totalUsers) * 100)
        : 0;

      // Get AI usage analytics for feature popularity
      const analytics = await this.getAIUsageAnalytics();
      const mostPopular = analytics.length > 0 ? analytics[0] : null;
      const leastPopular =
        analytics.length > 0 ? analytics[analytics.length - 1] : null;

      // Calculate daily average for last 30 days
      const { count: last30DaysEvents } = await supabase
        .from("ai_usage_tracking")
        .select("*", { count: "exact", head: true })
        .gte(
          "created_at",
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        );

      const dailyAverageUsage = last30DaysEvents
        ? Math.round((last30DaysEvents / 30) * 100) / 100
        : 0;

      return {
        total_users_with_ai_usage: totalUsersWithAIUsage,
        total_ai_events: totalAIEvents || 0,
        adoption_rate: adoptionRate,
        most_popular_feature: mostPopular?.feature_type || "None",
        least_popular_feature: leastPopular?.feature_type || "None",
        daily_average_usage: dailyAverageUsage,
      };
    } catch (error) {
      console.error(
        `[aiUsageTrackingService] Error in manual calculation:`,
        error,
      );
      return {
        total_users_with_ai_usage: 0,
        total_ai_events: 0,
        adoption_rate: 0,
        most_popular_feature: "None",
        least_popular_feature: "None",
        daily_average_usage: 0,
      };
    }
  },
};
