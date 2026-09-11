import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { SitePageviewsRepository } from "@/repositories/site-pageviews-repo";

const RANGE_DAYS: Record<string, number> = {
  today: 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

type PageviewRow = {
  created_at: string | null;
  visitor_id: string | null;
  session_id: string | null;
};

function buildDateRange(startDate: Date, days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

export class AnalyticsService {
  private readonly pageviewsRepo: SitePageviewsRepository;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.pageviewsRepo = new SitePageviewsRepository(supabase);
  }

  async trackPageview(payload: {
    path: string;
    referrer: string | null;
    visitorId: string;
    sessionId: string;
    userId: string | null;
  }) {
    await this.pageviewsRepo.insert({
      path: payload.path,
      referrer: payload.referrer,
      visitor_id: payload.visitorId,
      session_id: payload.sessionId,
      user_id: payload.userId,
    });
  }

  async getAdminAnalytics(rangeKey: string) {
    const days = RANGE_DAYS[rangeKey] ?? 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const rows = (await this.pageviewsRepo.listSince(
      startDate.toISOString(),
    )) as PageviewRow[];
    const visitors = new Set<string>();
    const sessions = new Set<string>();
    const dailySessions = new Map<string, Set<string>>();

    rows.forEach((row, index) => {
      if (!row.created_at) {
        return;
      }
      const date = new Date(row.created_at).toISOString().slice(0, 10);
      if (row.visitor_id) {
        visitors.add(row.visitor_id);
      }
      const sessionId = row.session_id || row.visitor_id || "anonymous-" + index;
      sessions.add(sessionId);
      const daily = dailySessions.get(date) ?? new Set<string>();
      daily.add(sessionId);
      dailySessions.set(date, daily);
    });

    return {
      trafficSummary: {
        visits: sessions.size,
        uniqueVisitors: visitors.size,
        pageViews: rows.length,
      },
      trafficTrend: buildDateRange(startDate, days).map((date) => ({
        date,
        visits: dailySessions.get(date)?.size ?? 0,
      })),
    };
  }
}
