import { getApiUrl } from '../../config/api';
import {type Repo } from '../../types/repo';

export class GithubApi {
  static async fetchUserRepos(token: string | null): Promise<Repo[]> {
    if (!token) return [];
    const apiUrl = getApiUrl();

    // Stage 1: Try backend proxy
    try {
      const res = await fetch(`${apiUrl}/api/github/repos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        return (await res.json()) as Repo[];
      }
    } catch {
      // fallback
    }

    // Stage 2: Direct GitHub API fallback
    try {
      const payloadBase64 = token.split('.')[1];
      const decoded = JSON.parse(atob(payloadBase64)) as { githubToken?: string };
      const githubToken = decoded.githubToken;

      if (githubToken) {
        const ghRes = await fetch(
          'https://api.github.com/user/repos?sort=updated&per_page=100',
          {
            headers: {
              Authorization: `Bearer ${githubToken}`,
              'User-Agent': 'mini-vercel-sandbox-frontend',
              Accept: 'application/vnd.github+json',
            },
          }
        );
        if (ghRes.ok) {
          const ghRepos = (await ghRes.json()) as Array<{
            id: number;
            name: string;
            full_name: string;
            private: boolean;
            html_url: string;
            description: string | null;
            updated_at: string;
          }>;
          return ghRepos.map((r) => ({
            id: r.id,
            name: r.name,
            fullName: r.full_name,
            isPrivate: r.private,
            url: r.html_url,
            description: r.description,
            updatedAt: r.updated_at,
          }));
        }
      }
    } catch (err) {
      console.error('Direct GitHub fallback failed:', err);
    }

    return [];
  }
}
