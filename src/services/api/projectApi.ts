import { getVerifiedApiUrl, getApiUrl, LOCAL_BACKEND_URL, LIVE_BACKEND_URL } from '../../config/api';
import { type UploadedFilePayload } from '../../types/upload';
import { type SandboxItem } from '../../types/sandbox';

export class ProjectApi {
  private static getHeaders() {
    const token = localStorage.getItem('oauth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  /**
   * Helper that executes fetch against the active API URL (local if running, else live).
   * If local backend was active but connection fails, it transparently retries on live backend.
   */
  private static async fetchWithAutoFallback(endpoint: string, options?: RequestInit): Promise<Response> {
    const apiUrl = await getVerifiedApiUrl();
    try {
      return await fetch(`${apiUrl}${endpoint}`, options);
    } catch (err) {
      if (apiUrl === LOCAL_BACKEND_URL) {
        console.warn(`[ProjectApi] Local backend call failed. Automatically falling back to live backend...`);
        return await fetch(`${LIVE_BACKEND_URL}${endpoint}`, options);
      }
      throw err;
    }
  }

  static async triggerGitDeploy(
    repositoryUrl: string,
    repoName?: string,
    envVars?: any,
    rootDir?: string,
    projectType?: string
  ) {
    const res = await this.fetchWithAutoFallback('/api/project/run', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ repositoryUrl, repoName, envVars, rootDir, projectType }),
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  }

  static async triggerFilesDeploy(repoName: string, files: UploadedFilePayload[], envVars?: any) {
    const res = await this.fetchWithAutoFallback('/api/project/upload-deploy', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ repoName, files, envVars }),
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  }

  static async fetchSandboxes(): Promise<SandboxItem[]> {
    try {
      const res = await this.fetchWithAutoFallback('/api/project/sandboxes');
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.sandboxes) ? data.sandboxes : [];
    } catch {
      return [];
    }
  }

  static async stopSandbox(id: string) {
    try {
      const res = await this.fetchWithAutoFallback(`/api/project/stop/${id}`, {
        method: 'POST',
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  static async fetchStatus(id: string) {
    try {
      const res = await this.fetchWithAutoFallback(`/api/project/status/${id}`);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  static getStreamUrl(id: string): string {
    const apiUrl = getApiUrl();
    return `${apiUrl}/api/project/stream/${id}`;
  }
}
