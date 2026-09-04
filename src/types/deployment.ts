import { type Repo } from './repo';

export interface ActiveDeployment {
  id: string;
  repo: Repo;
  step: number;
  status: string;
  url?: string;
  error?: string;
  logs: string[];
  expiresAt?: string;
  detectedEnv?: {
    file: string;
    keys: string[];
    template?: string;
  };
}
