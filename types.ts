
export interface AforoEntry {
  timestamp: string;
  occupancy: number;
  dayOfWeek: string;
  hour: number;
}

export interface StatisticalSummary {
  mean: number;
  median: number;
  percentile25: number;
  stdDev: number;
  max: number;
  min: number;
  bestHour: string;
  trend: 'up' | 'down' | 'stable';
}

export interface PredictionResult {
  recommendation: string;
  goldenHour: string;
  analysis: string;
  statistics: StatisticalSummary;
}
