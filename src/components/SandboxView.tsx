import { useState } from 'react';
import type { Repo } from './ImportRepo';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  children?: FileNode[];
}

interface SandboxViewProps {
  repo: Repo;
  onBack: () => void;
}

const MOCK_TREE: FileNode[] = [
  {
    name: 'src',
    path: 'src',
    type: 'dir',
    children: [
      { name: 'index.ts', path: 'src/index.ts', type: 'file' },
      { name: 'App.tsx', path: 'src/App.tsx', type: 'file' },
      {
        name: 'components',
        path: 'src/components',
        type: 'dir',
        children: [
          { name: 'Navbar.tsx', path: 'src/components/Navbar.tsx', type: 'file' },
          { name: 'Button.tsx', path: 'src/components/Button.tsx', type: 'file' },
        ],
      },
    ],
  },
  { name: 'package.json', path: 'package.json', type: 'file' },
  { name: 'tsconfig.json', path: 'tsconfig.json', type: 'file' },
  { name: 'README.md', path: 'README.md', type: 'file' },
];

const MOCK_CONTENT: Record<string, string> = {
  'src/index.ts': `import express from 'express';
const app = express();
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.listen(5000, () => console.log('Server running on 5000'));`,
  'src/App.tsx': `import { useState } from 'react';
export default function App() {
  return <h1>Direct Import Successful!</h1>;
}`,
  'src/components/Navbar.tsx': `export function Navbar() {
  return <nav>Navbar</nav>;
}`,
  'src/components/Button.tsx': `export function Button() {
  return <button>Button</button>;
}`,
  'package.json': `{ "name": "demo", "dependencies": { "react": "^18.2.0" } }`,
  'tsconfig.json': `{ "compilerOptions": { "strict": true } }`,
  'README.md': `# Direct Sandbox View`,
};

function getFileIcon(name: string): string {
  if (name.endsWith('.tsx') || name.endsWith('.jsx')) return '⚛';
  if (name.endsWith('.ts') || name.endsWith('.js')) return '𝑓';
  if (name.endsWith('.json')) return '{}';
  if (name.endsWith('.md')) return '📄';
  return '📄';
}

function TreeNode({
  node,
  depth,
  selectedPath,
  onSelect,
}: {
  node: FileNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (node: FileNode) => void;
}) {
  const [open, setOpen] = useState(depth === 0);
  const isSelected = node.path === selectedPath;

  if (node.type === 'dir') {
    return (
      <div>
        <div
          onClick={() => setOpen((o) => !o)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: `4px 8px 4px ${8 + depth * 14}px`,
            cursor: 'pointer',
            borderRadius: '4px',
            fontSize: '12.5px',
            color: '#999',
            userSelect: 'none',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = '#161616')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
        >
          <span style={{ fontSize: '9px', display: 'inline-block', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
          <span>📁</span>
          <span>{node.name}</span>
        </div>
        {open && node.children?.map((child) => (
          <TreeNode key={child.path} node={child} depth={depth + 1} selectedPath={selectedPath} onSelect={onSelect} />
        ))}
      </div>
    );
  }

  return (
    <div
      onClick={() => onSelect(node)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        padding: `4px 8px 4px ${8 + depth * 14}px`,
        cursor: 'pointer',
        borderRadius: '4px',
        fontSize: '12.5px',
        color: isSelected ? '#fff' : '#777',
        background: isSelected ? 'rgba(255,255,255,0.06)' : 'transparent',
        borderLeft: isSelected ? '2px solid #4ade80' : '2px solid transparent',
      }}
      onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = '#161616'; }}
      onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
    >
      <span>{getFileIcon(node.name)}</span>
      <span>{node.name}</span>
    </div>
  );
}

export function SandboxView({ repo, onBack }: SandboxViewProps) {
  const [selectedFile, setSelectedFile] = useState<FileNode | null>({
    name: 'index.ts',
    path: 'src/index.ts',
    type: 'file',
  });

  const content = selectedFile ? (MOCK_CONTENT[selectedFile.path] ?? '// No content') : '';
  const lines = content.split('\n');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', background: '#080808' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid #1a1a1a', background: '#0a0a0a', height: '44px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={onBack}
            style={{ background: 'transparent', border: '1px solid #252525', borderRadius: '6px', color: '#666', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}
          >
            ← Back
          </button>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#ddd' }}>{repo.fullName || repo.name}</span>
        </div>
      </div>

      {/* Workspace */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{ width: '220px', background: '#0c0c0c', borderRight: '1px solid #181818', overflowY: 'auto', padding: '10px 4px' }}>
          {MOCK_TREE.map((node) => (
            <TreeNode key={node.path} node={node} depth={0} selectedPath={selectedFile?.path ?? null} onSelect={setSelectedFile} />
          ))}
        </div>

        {/* Code viewer */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0a0a0a', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflow: 'auto', padding: '16px 0', fontFamily: 'monospace', fontSize: '13px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i}>
                    <td style={{ width: '40px', textAlign: 'right', paddingRight: '16px', color: '#333', userSelect: 'none' }}>{i + 1}</td>
                    <td style={{ whiteSpace: 'pre', color: '#cdd3de' }}>{line || ' '}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
