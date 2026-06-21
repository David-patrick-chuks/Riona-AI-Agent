export type ActionLogStatus = 'success' | 'error';

export type ActionLogRow = {
  id: string;
  platform: string;
  action: string;
  account: string;
  username?: string;
  status: ActionLogStatus;
  error?: string;
  details?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
};
