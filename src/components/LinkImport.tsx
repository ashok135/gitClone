import { useState } from 'react';
import { ChevronDown, ChevronUp, FolderTree, Cpu, Globe } from 'lucide-react';

interface LinkImportProps {
  customRepoUrl: string;
  onUrlChange: (url: string) => void;
  onImport: (rootDir?: string, projectType?: 'frontend' | 'backend' | 'auto') => void;
}

const ROOT_PRESETS = [
  { label: './ (Root)', value: '' },
  { label: 'frontend', value: 'frontend' },
  { label: 'backend', value: 'backend' },
  { label: 'client', value: 'client' },
  { label: 'server', value: 'server' },
];

export function LinkImport({ customRepoUrl, onUrlChange, onImport }: LinkImportProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [rootDir, setRootDir] = useState('');
  const [projectType, setProjectType] = useState<'frontend' | 'backend' | 'auto'>('auto');

  const handleImportClick = () => {
    if (!customRepoUrl.trim()) return;
    onImport(rootDir.trim() || undefined, projectType);
  };

  return (
    <div
      style={{
        borderRadius: '10px',
        border: '1px solid #1f1f1f',
        background: '#0a0a0a',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* Header */}
      <div>
        <h3
          style={{
            fontSize: '14px',
            fontWeight: '700',
            color: '#fff',
            margin: '0 0 6px 0',
          }}
        >
          Import Third-Party Git Repository
        </h3>
        <p style={{ fontSize: '12px', color: '#555', margin: 0, lineHeight: '1.6' }}>
          Paste a public Git repository URL to clone and deploy it as a sandbox. Supports both Monorepos and single apps.
        </p>
      </div>

      {/* URL input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ position: 'relative' }}>
          {/* Git icon */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#555"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              position: 'absolute',
              left: '11px',
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          >
            <circle cx="18" cy="18" r="3" />
            <circle cx="6" cy="6" r="3" />
            <path d="M13 6h3a2 2 0 0 1 2 2v7" />
            <line x1="6" y1="9" x2="6" y2="21" />
          </svg>
          <input
            type="text"
            placeholder="https://github.com/username/repo"
            value={customRepoUrl}
            onChange={(e) => onUrlChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleImportClick()}
            style={{
              width: '100%',
              background: '#111',
              border: '1px solid #2a2a2a',
              borderRadius: '7px',
              padding: '8px 12px 8px 32px',
              fontSize: '12px',
              color: '#e4e4e4',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Monorepo / Root Directory Accordion Trigger */}
        <button
          type="button"
          onClick={() => setShowSettings((prev) => !prev)}
          style={{
            background: 'transparent',
            border: 'none',
            color: showSettings ? '#fff' : '#888',
            fontSize: '11.5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 2px',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FolderTree size={13} color="#3b82f6" />
            <span>Root Directory (Monorepo Settings)</span>
            {rootDir && (
              <span
                style={{
                  fontSize: '10px',
                  background: 'rgba(59,130,246,0.15)',
                  color: '#60a5fa',
                  padding: '1px 6px',
                  borderRadius: '4px',
                }}
              >
                /{rootDir}
              </span>
            )}
          </span>
          {showSettings ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {/* Collapsible Settings Panel */}
        {showSettings && (
          <div
            style={{
              background: '#111',
              border: '1px solid #222',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* Quick preset chips */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#aaa',
                  marginBottom: '6px',
                }}
              >
                Select Subfolder:
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {ROOT_PRESETS.map((preset) => {
                  const isSelected = rootDir === preset.value;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setRootDir(preset.value)}
                      style={{
                        background: isSelected ? '#3b82f6' : '#181818',
                        color: isSelected ? '#fff' : '#aaa',
                        border: isSelected ? '1px solid #3b82f6' : '1px solid #282828',
                        borderRadius: '5px',
                        padding: '3px 8px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: isSelected ? 600 : 400,
                        transition: 'all 0.15s',
                      }}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom input */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#aaa',
                  marginBottom: '4px',
                }}
              >
                Or Custom Path:
              </label>
              <input
                type="text"
                placeholder="e.g. apps/web or packages/api"
                value={rootDir}
                onChange={(e) => setRootDir(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0d0d0d',
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
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#aaa',
                  marginBottom: '6px',
                }}
              >
                Target Type:
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { id: 'auto', label: 'Auto Detect', icon: null },
                  { id: 'frontend', label: 'Frontend UI', icon: <Globe size={11} /> },
                  { id: 'backend', label: 'Backend API', icon: <Cpu size={11} /> },
                ].map((item) => {
                  const isSelected = projectType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setProjectType(item.id as any)}
                      style={{
                        flex: 1,
                        background: isSelected ? '#242424' : '#141414',
                        color: isSelected ? '#fff' : '#777',
                        border: isSelected ? '1px solid #444' : '1px solid #222',
                        borderRadius: '5px',
                        padding: '4px 6px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
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

        <button
          onClick={handleImportClick}
          disabled={!customRepoUrl.trim()}
          style={{
            width: '100%',
            background: customRepoUrl.trim() ? '#fff' : '#1a1a1a',
            color: customRepoUrl.trim() ? '#000' : '#444',
            border: 'none',
            borderRadius: '7px',
            padding: '8px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: customRepoUrl.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s',
            marginTop: '4px',
          }}
          onMouseEnter={(e) => {
            if (customRepoUrl.trim())
              (e.currentTarget as HTMLButtonElement).style.background = '#e5e5e5';
          }}
          onMouseLeave={(e) => {
            if (customRepoUrl.trim())
              (e.currentTarget as HTMLButtonElement).style.background = '#fff';
          }}
          onMouseDown={(e) => {
            if (customRepoUrl.trim())
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)';
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
        >
          Import {rootDir ? `(${rootDir})` : ''}
        </button>
      </div>

      <style>{`
        input::placeholder { color: #444; }
        input:focus { border-color: #444 !important; }
      `}</style>
    </div>
  );
}
