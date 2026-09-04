export interface SandboxItem {
  id: string;
  repoName: string;
  repoUrl?: string;
  isUpload?: boolean;
  status: string;
  step?: number;
  port?: number;
  url?: string | null;
  rootDir?: string;
  isBackend?: boolean;
  projectType?: 'frontend' | 'backend' | 'auto';
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
