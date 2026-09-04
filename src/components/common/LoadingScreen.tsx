import React from 'react';

export const LoadingScreen: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: 'calc(100vh - 64px)',
        gap: '16px',
      }}
    >
      <div
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          border: '2px solid #222',
          borderTopColor: '#fff',
          animation: 'spin 0.7s linear infinite',
        }}
      />
      <p style={{ fontSize: '13px', color: '#555', margin: 0 }}>
        Completing GitHub authentication…
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
