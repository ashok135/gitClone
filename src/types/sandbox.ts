export interface SandboxItem {
  id: string;
  repoName: string;
  repoUrl?: string;
  isUpload?: boolean;
  status: string;
  step?: number;
  port?: number;
  url?: string | null;
  createdAt: string;
  expiresAt?: string;
  ttlMinutes?: number;
  detectedEnv?: {
    file: string;
    keys: string[];
    template?: string;
  };
  logs?: string[];
}
