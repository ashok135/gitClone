import React from 'react';

interface WorkspaceHeaderProps {
  user: {
    name: string;
    email?: string | null;
    avatarUrl: string;
  };
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({ user }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
      <img
        src={user.avatarUrl}
        alt={user.name}
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          border: '1px solid #2a2a2a',
        }}
      />
      <div>
        <h2
          style={{
            fontSize: '16px',
            fontWeight: '700',
            color: '#fff',
            margin: 0,
          }}
        >
          {user.name}'s Workspace
        </h2>
        {user.email && (
          <p style={{ fontSize: '12px', color: '#555', margin: '2px 0 0 0' }}>
            {user.email}
          </p>
        )}
      </div>
    </div>
  );
};
