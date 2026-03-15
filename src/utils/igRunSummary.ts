export type IgRunSummary = {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  postsVisited: number;
  likes: number;
  comments: number;
  skippedSponsored: number;
  errors: number;
};

let lastRunSummary: IgRunSummary | null = null;

export const setLastRunSummary = (summary: IgRunSummary) => {
  lastRunSummary = summary;
};

export const getLastRunSummary = () => lastRunSummary;
