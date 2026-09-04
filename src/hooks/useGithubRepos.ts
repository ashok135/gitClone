import { useState, useEffect } from 'react';
import {type Repo } from '../types/repo';
import { GithubApi } from '../services/api/githubApi';

export function useGithubRepos(user: any) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [fetchingRepos, setFetchingRepos] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customRepoUrl, setCustomRepoUrl] = useState('');
  const [importedRepoIds, setImportedRepoIds] = useState<number[]>([]);

  useEffect(() => {
    if (!user) {
      setRepos([]);
      setImportedRepoIds([]);
      return;
    }

    const loadRepos = async () => {
      setFetchingRepos(true);
      try {
        const token = localStorage.getItem('oauth_token');
        const data = await GithubApi.fetchUserRepos(token);
        setRepos(data);
      } catch (err) {
        console.error('Failed to load GitHub repos:', err);
      } finally {
        setFetchingRepos(false);
      }
    };

    loadRepos();
  }, [user]);

  const markAsImported = (id: number) => {
    setImportedRepoIds((prev) => [...prev, id]);
  };

  const availableRepos = repos.filter((r) => !importedRepoIds.includes(r.id));

  return {
    repos: availableRepos,
    allRepos: repos,
    fetchingRepos,
    searchQuery,
    setSearchQuery,
    customRepoUrl,
    setCustomRepoUrl,
    markAsImported,
  };
}
