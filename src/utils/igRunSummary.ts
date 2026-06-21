export type IgRunSummary = {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  postsVisited: number;
  likes: number;
  comments: number;
  skippedSponsored: number;
  errors: number;
  reason?: string;
};

let lastRunSummary: IgRunSummary | null = null;

export const setLastRunSummary = (summary: IgRunSummary) => {
  lastRunSummary = summary;
};

export const getLastRunSummary = () => lastRunSummary;
