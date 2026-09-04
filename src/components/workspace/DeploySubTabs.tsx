import React from 'react';
import { GitBranch, FolderUp } from 'lucide-react';

interface DeploySubTabsProps {
  mode: 'git' | 'folder';
  onSelectMode: (mode: 'git' | 'folder') => void;
}

export const DeploySubTabs: React.FC<DeploySubTabsProps> = ({ mode, onSelectMode }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        borderBottom: '1px solid #1c1c1c',
        paddingBottom: '12px',
      }}
    >
      <button
        onClick={() => onSelectMode('git')}
        style={{
          background: mode === 'git' ? '#fff' : '#141414',
          color: mode === 'git' ? '#000' : '#888',
          border: '1px solid #282828',
          borderRadius: '6px',
          padding: '6px 14px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <GitBranch size={15} color={mode === 'git' ? '#000' : '#888'} />
        <span>GitHub Repository</span>
      </button>

      <button
        onClick={() => onSelectMode('folder')}
        style={{
          background: mode === 'folder' ? '#fff' : '#141414',
          color: mode === 'folder' ? '#000' : '#888',
          border: '1px solid #282828',
          borderRadius: '6px',
          padding: '6px 14px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <FolderUp size={15} color={mode === 'folder' ? '#000' : '#888'} />
        <span>Upload Local Folder / .ZIP</span>
      </button>
    </div>
  );
};
