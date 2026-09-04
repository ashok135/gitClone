import { useState } from 'react';
import type { User } from '../types/auth';
import { FolderTree, ChevronDown, ChevronUp, Globe, Cpu } from 'lucide-react';

const ROOT_PRESETS = [
  { label: './ (Root)', value: '' },
  { label: 'frontend', value: 'frontend' },
  { label: 'backend', value: 'backend' },
  { label: 'client', value: 'client' },
  { label: 'server', value: 'server' },
];

export interface Repo {
  id: number;
  name: string;
  fullName: string;
  isPrivate: boolean;
  url: string;
  description: string | null;
  updatedAt: string;
}

interface ImportRepoProps {
  user: User;
  repos: Repo[];
  fetchingRepos: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onImport: (repo: Repo, rootDir?: string, projectType?: 'frontend' | 'backend' | 'auto') => void;
}

function relativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return '1d ago';
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const BADGE_COLORS = [
  { bg: '#7c3aed', text: '#fff' },
  { bg: '#0ea5e9', text: '#fff' },
  { bg: '#f59e0b', text: '#000' },
  { bg: '#10b981', text: '#fff' },
  { bg: '#ef4444', text: '#fff' },
  { bg: '#8b5cf6', text: '#fff' },
  { bg: '#f97316', text: '#fff' },
];

function getBadgeColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return BADGE_COLORS[Math.abs(hash) % BADGE_COLORS.length];
}

function getBadgeInitials(name: string): string {
  const words = name.split(/[-_. ]+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toLowerCase();
  return (words[0][0] + words[1][0]).toLowerCase();
}

function LockIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'inline', verticalAlign: 'middle', marginBottom: '1px' }}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function ImportRepo({
  user,
  repos,
  fetchingRepos,
  searchQuery,
  onSearchChange,
  onImport,
}: ImportRepoProps) {
  const [showAll, setShowAll] = useState(false);
  const [configuringRepoId, setConfiguringRepoId] = useState<number | null>(null);
  const [repoRootDirs, setRepoRootDirs] = useState<Record<number, string>>({});
  const [repoProjectTypes, setRepoProjectTypes] = useState<Record<number, 'frontend' | 'backend' | 'auto'>>({});

  const filteredRepos = repos.filter((repo) =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const visibleRepos = showAll ? filteredRepos : filteredRepos.slice(0, 5);
  const hasMore = filteredRepos.length > 5;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      <div style={{ paddingBottom: '20px' }}>
        <h3
          style={{
            fontSize: '22px',
            fontWeight: '700',
            color: '#fff',
            margin: 0,
            letterSpacing: '-0.3px',
          }}
        >
          Import Git Repository
        </h3>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '0', alignItems: 'center' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#111',
            border: '1px solid #2a2a2a',
            borderRadius: '8px',
            padding: '8px 12px',
            minWidth: '160px',
            userSelect: 'none',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" style={{ flexShrink: 0 }}>
            <path
              fillRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              clipRule="evenodd"
            />
          </svg>
          <span style={{ fontSize: '13px', color: '#e4e4e4', fontWeight: '500', flex: 1 }}>
            {user.username}
          </span>
        </div>

        <div style={{ flex: 1, position: 'relative' }}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#555"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: '100%',
              background: '#111',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              padding: '8px 12px 8px 34px',
              fontSize: '13px',
              color: '#e4e4e4',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      <div style={{ height: '1px', background: '#1f1f1f', margin: '0' }} />

      <div
        style={{
          border: '1px solid #1f1f1f',
          borderTop: 'none',
          borderRadius: '0 0 10px 10px',
          overflow: 'hidden',
          background: '#0a0a0a',
        }}
      >
        {fetchingRepos ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '48px 0',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                border: '2px solid #333',
                borderTopColor: '#888',
                animation: 'spin 0.7s linear infinite',
              }}
            />
            <span style={{ fontSize: '12px', color: '#666' }}>Loading repositories...</span>
          </div>
        ) : visibleRepos.length > 0 ? (
          <>
            {visibleRepos.map((repo, idx) => {
              const badge = getBadgeColor(repo.name);
              const initials = getBadgeInitials(repo.name);
              const isConfiguring = configuringRepoId === repo.id;
              const selectedRootDir = repoRootDirs[repo.id] || '';
              const selectedType = repoProjectTypes[repo.id] || 'auto';
              return (
                <div
                  key={repo.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    borderTop: idx === 0 ? 'none' : '1px solid #1a1a1a',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      transition: 'background 0.15s',
                      cursor: 'default',
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLDivElement).style.background = '#111')
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLDivElement).style.background = 'transparent')
                    }
                  >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: badge.bg,
                        color: badge.text,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        fontWeight: '700',
                        letterSpacing: '-0.5px',
                        flexShrink: 0,
                        fontFamily: 'monospace',
                      }}
                    >
                      {initials}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>
                          {repo.name}
                        </span>
                        {repo.isPrivate && <LockIcon />}
                        <span style={{ fontSize: '12px', color: '#555' }}>
                          · {relativeTime(repo.updatedAt)}
                        </span>
                      </div>
                      {repo.description && (
                        <p
                          style={{
                            margin: '2px 0 0 0',
                            fontSize: '11px',
                            color: '#555',
                            maxWidth: '320px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {repo.description}
                        </p>
                      )}
                    </div>
                  </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() =>
                          setConfiguringRepoId((prev) => (prev === repo.id ? null : repo.id))
                        }
                        title="Configure Root Directory (Monorepo Settings)"
                        style={{
                          background: isConfiguring ? '#222' : '#141414',
                          border: isConfiguring ? '1px solid #444' : '1px solid #282828',
                          borderRadius: '7px',
                          padding: '6px 9px',
                          fontSize: '11.5px',
                          color: isConfiguring ? '#60a5fa' : '#888',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s',
                        }}
                      >
                        <FolderTree size={13} color={selectedRootDir ? '#60a5fa' : '#888'} />
                        {selectedRootDir ? (
                          <span style={{ fontWeight: 600, color: '#60a5fa' }}>/{selectedRootDir}</span>
                        ) : null}
                        {isConfiguring ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>

                      <button
                        onClick={() =>
                          onImport(
                            repo,
                            selectedRootDir.trim() || undefined,
                            selectedType
                          )
                        }
                        style={{
                          background: '#fff',
                          color: '#000',
                          border: 'none',
                          borderRadius: '7px',
                          padding: '6px 16px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          flexShrink: 0,
                          transition: 'background 0.15s, transform 0.1s',
                        }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLButtonElement).style.background = '#e5e5e5')
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLButtonElement).style.background = '#fff')
                        }
                        onMouseDown={(e) =>
                          ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)')
                        }
                        onMouseUp={(e) =>
                          ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)')
                        }
                      >
                        Import {selectedRootDir ? `(${selectedRootDir})` : ''}
                      </button>
                    </div>
                  </div>

                  {/* Collapsible Root Directory & Monorepo Panel for this repo */}
                  {isConfiguring && (
                    <div
                      style={{
                        background: '#0d0d0d',
                        borderTop: '1px solid #1f1f1f',
                        padding: '12px 18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#aaa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FolderTree size={13} color="#3b82f6" />
                          Root Directory & Subfolder Settings
                        </span>
                        <span style={{ fontSize: '11px', color: '#666' }}>Select or enter the subfolder to deploy</span>
                      </div>

                      {/* Preset Chips */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {ROOT_PRESETS.map((preset) => {
                          const isSelected = selectedRootDir === preset.value;
                          return (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() =>
                                setRepoRootDirs((prev) => ({
                                  ...prev,
                                  [repo.id]: preset.value,
                                }))
                              }
                              style={{
                                background: isSelected ? '#3b82f6' : '#161616',
                                color: isSelected ? '#fff' : '#aaa',
                                border: isSelected ? '1px solid #3b82f6' : '1px solid #282828',
                                borderRadius: '5px',
                                padding: '3px 8px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                fontWeight: isSelected ? 600 : 400,
                              }}
                            >
                              {preset.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom subpath input & target type */}
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '180px' }}>
                          <input
                            type="text"
                            placeholder="Custom subfolder (e.g. apps/web or packages/api)"
                            value={selectedRootDir}
                            onChange={(e) =>
                              setRepoRootDirs((prev) => ({
                                ...prev,
                                [repo.id]: e.target.value,
                              }))
                            }
                            style={{
                              width: '100%',
                              background: '#141414',
                              border: '1px solid #2a2a2a',
                              borderRadius: '6px',
                              padding: '6px 10px',
                              fontSize: '11.5px',
                              color: '#fff',
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>

                        {/* Project Type Switcher */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {[
                            { id: 'auto', label: 'Auto Detect', icon: null },
                            { id: 'frontend', label: 'Frontend UI', icon: <Globe size={11} /> },
                            { id: 'backend', label: 'Backend API', icon: <Cpu size={11} /> },
                          ].map((item) => {
                            const isSelected = selectedType === item.id;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() =>
                                  setRepoProjectTypes((prev) => ({
                                    ...prev,
                                    [repo.id]: item.id as any,
                                  }))
                                }
                                style={{
                                  background: isSelected ? '#262626' : '#141414',
                                  color: isSelected ? '#fff' : '#777',
                                  border: isSelected ? '1px solid #444' : '1px solid #222',
                                  borderRadius: '5px',
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontWeight: isSelected ? 600 : 400,
                                }}
                              >
                                {item.icon}
                                <span>{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {hasMore && (
              <div style={{ borderTop: '1px solid #1a1a1a', padding: '12px 18px', textAlign: 'center' }}>
                <button
                  onClick={() => setShowAll((prev) => !prev)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#555',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    padding: '0',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.color = '#aaa')
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.color = '#555')
                  }
                >
                  {showAll ? 'Show less' : `View all ${filteredRepos.length} repositories`}
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: '48px 0', textAlign: 'center', fontSize: '13px', color: '#444' }}>
            No repositories found matching your search.
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #444; }
        input:focus { border-color: #444 !important; }
      `}</style>
    </div>
  );
}
