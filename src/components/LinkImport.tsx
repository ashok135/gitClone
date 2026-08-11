interface LinkImportProps {
  customRepoUrl: string;
  onUrlChange: (url: string) => void;
  onImport: () => void;
}

export function LinkImport({ customRepoUrl, onUrlChange, onImport }: LinkImportProps) {
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
          Paste a public Git repository URL from GitHub, GitLab, or Bitbucket to instantly clone and deploy it as a sandbox.
        </p>
      </div>

      {/* URL input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
            onKeyDown={(e) => e.key === 'Enter' && onImport()}
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

        <button
          onClick={onImport}
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
          Import
        </button>
      </div>

      <style>{`
        input::placeholder { color: #444; }
        input:focus { border-color: #444 !important; }
      `}</style>
    </div>
  );
}
