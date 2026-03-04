export interface StatsEntry {
  label: string;
  entries: [string, number | string][];
}

export interface SessionStatsResult {
  models: string[];
  meta: [string, string | number][];
  sections: StatsEntry[];
  summary: StatsEntry | null;
  grandTotal: number | string;
}

export interface Plugin {
  name: string;
  findSession(sessionId: string): Promise<any>;
  aggregateStats(sessionData: any): Promise<SessionStatsResult>;
}
