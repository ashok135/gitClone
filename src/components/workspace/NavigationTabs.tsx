import React from 'react';

interface NavigationTabsProps {
  activeTab: 'deploy' | 'live';
  onSelectTab: (tab: 'deploy' | 'live') => void;
  activeCount: number;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onSelectTab,
  activeCount,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        background: '#101010',
        border: '1px solid #262626',
        borderRadius: '8px',
        padding: '4px',
        gap: '4px',
      }}
    >
      <button
        onClick={() => onSelectTab('deploy')}
        style={{
          background: activeTab === 'deploy' ? '#242424' : 'transparent',
          color: activeTab === 'deploy' ? '#fff' : '#888',
          border: 'none',
          borderRadius: '6px',
          padding: '8px 16px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.15s ease',
        }}
      >
        <span>🚀</span>
        <span>Import & Deploy</span>
      </button>

      <button
        onClick={() => onSelectTab('live')}
        style={{
          background: activeTab === 'live' ? '#242424' : 'transparent',
          color: activeTab === 'live' ? '#fff' : '#888',
          border: 'none',
          borderRadius: '6px',
          padding: '8px 16px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.15s ease',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: activeCount > 0 ? '#10b981' : '#6b7280',
            boxShadow: activeCount > 0 ? '0 0 8px #10b981' : 'none',
          }}
        />
        <span>Live Websites</span>
        <span
          style={{
            background: activeTab === 'live' ? '#fff' : '#1e1e1e',
            color: activeTab === 'live' ? '#000' : '#aaa',
            fontSize: '11px',
            padding: '1px 6px',
            borderRadius: '10px',
            fontWeight: 700,
          }}
        >
          {activeCount}
        </span>
      </button>
    </div>
  );
};
