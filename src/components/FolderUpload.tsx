import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import type { UploadedFilePayload } from '../types/upload';
import {
  FolderUp,
  UploadCloud,
  Loader2,
  Folder,
  Archive,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Zap,
  FileCode,
} from 'lucide-react';
export type { UploadedFilePayload };

interface FolderUploadProps {
  onDeployFiles: (repoName: string, files: UploadedFilePayload[], envVars?: string) => Promise<void>;
  isDeploying: boolean;
}

const IGNORED_DIRS = ['node_modules', '.git', '.next', 'dist', 'build', '.cache', '.turbo', 'coverage'];
const IGNORED_FILES = ['.DS_Store', 'Thumbs.db'];

const TEXT_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.json', '.html', '.css', '.scss', '.sass', '.less',
  '.svg', '.md', '.txt', '.env', '.env.example', '.env.local',
  '.yaml', '.yml', '.toml', '.xml', '.config', '.prisma',
  '.graphql', '.gql'
];

function isTextFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext)) || !lower.includes('.');
}

export const FolderUpload: React.FC<FolderUploadProps> = ({ onDeployFiles, isDeploying }) => {
  const [dragActive, setDragActive] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [files, setFiles] = useState<UploadedFilePayload[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Optional custom env vars
  const [detectedEnvExample, setDetectedEnvExample] = useState<string | null>(null);
  const [customEnv, setCustomEnv] = useState('');
  const [showEnvEditor, setShowEnvEditor] = useState(false);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const processFileList = async (fileList: FileList | File[], defaultName?: string) => {
    setReading(true);
    setError(null);

    try {
      const processed: UploadedFilePayload[] = [];
      let totalBytes = 0;
      let detectedEnv: string | null = null;

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        // Relative path if available from webkitRelativePath
        const relativePath = file.webkitRelativePath || file.name;
        const normalized = relativePath.replace(/\\/g, '/');

        // Check if any ignored folder is in the path
        const parts = normalized.split('/');
        if (parts.some((p) => IGNORED_DIRS.includes(p)) || IGNORED_FILES.includes(file.name)) {
          continue;
        }

        totalBytes += file.size;

        if (isTextFile(file.name)) {
          const text = await file.text();
          processed.push({ path: normalized, content: text, encoding: 'utf8' });

          if (file.name === '.env.example' || file.name === '.env.sample') {
            detectedEnv = text;
          }
        } else {
          // Read binary as base64
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const res = reader.result as string;
              const b64 = res.split(',')[1] || '';
              resolve(b64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          processed.push({ path: normalized, content: base64, encoding: 'base64' });
        }
      }

      if (processed.length === 0) {
        throw new Error('No valid project files found (all files may have been ignored or empty).');
      }

      setFiles(processed);
      setTotalSize(totalBytes);

      // Infer project name from first directory or package.json
      if (!projectName) {
        if (defaultName) {
          setProjectName(defaultName);
        } else if (fileList[0]?.webkitRelativePath) {
          const rootFolder = fileList[0].webkitRelativePath.split('/')[0];
          setProjectName(rootFolder);
        } else {
          setProjectName('my-uploaded-app');
        }
      }

      if (detectedEnv) {
        setDetectedEnvExample(detectedEnv);
        setCustomEnv(detectedEnv);
        setShowEnvEditor(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to read files');
    } finally {
      setReading(false);
    }
  };

  const processZipFile = async (zipFile: File) => {
    setReading(true);
    setError(null);
    try {
      const zip = await JSZip.loadAsync(zipFile);
      const processed: UploadedFilePayload[] = [];
      let totalBytes = 0;
      let detectedEnv: string | null = null;

      const entries = Object.keys(zip.files);
      for (const relativePath of entries) {
        const zipEntry = zip.files[relativePath];
        if (zipEntry.dir) continue;

        const normalized = relativePath.replace(/\\/g, '/');
        const parts = normalized.split('/');
        if (parts.some((p) => IGNORED_DIRS.includes(p)) || IGNORED_FILES.includes(parts[parts.length - 1])) {
          continue;
        }

        if (isTextFile(zipEntry.name)) {
          const text = await zipEntry.async('text');
          processed.push({ path: normalized, content: text, encoding: 'utf8' });
          totalBytes += text.length;

          if (zipEntry.name.endsWith('.env.example') || zipEntry.name.endsWith('.env.sample')) {
            detectedEnv = text;
          }
        } else {
          const base64 = await zipEntry.async('base64');
          processed.push({ path: normalized, content: base64, encoding: 'base64' });
          totalBytes += Math.round((base64.length * 3) / 4);
        }
      }

      if (processed.length === 0) {
        throw new Error('No valid files found inside the ZIP archive.');
      }

      setFiles(processed);
      setTotalSize(totalBytes);

      const cleanName = zipFile.name.replace(/\.zip$/i, '');
      setProjectName(cleanName || 'my-zip-app');

      if (detectedEnv) {
        setDetectedEnvExample(detectedEnv);
        setCustomEnv(detectedEnv);
        setShowEnvEditor(true);
      }
    } catch (err: any) {
      setError(`Failed to extract ZIP: ${err.message}`);
    } finally {
      setReading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const firstFile = e.dataTransfer.files[0];
      if (firstFile.name.toLowerCase().endsWith('.zip')) {
        await processZipFile(firstFile);
      } else {
        await processFileList(e.dataTransfer.files);
      }
    }
  };

  const handleFolderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFileList(e.target.files);
    }
  };

  const handleZipChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processZipFile(e.target.files[0]);
    }
  };

  const handleDeploy = async () => {
    if (files.length === 0) return;
    const name = projectName.trim() || 'uploaded-project';
    await onDeployFiles(name, files, customEnv || undefined);
  };

  return (
    <div
      style={{
        background: '#0d0d0d',
        border: '1px solid #222',
        borderRadius: '12px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <FolderUp size={18} color="#60a5fa" />
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#fff' }}>
            Upload HTML File, Project Folder, or .ZIP
          </h3>
        </div>
        <p style={{ margin: 0, fontSize: '13px', color: '#888', lineHeight: 1.5 }}>
          Deploy simple HTML files, full-stack frontends, or static websites directly from your computer. Simple HTML pages go live instantly with zero configuration!
        </p>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-ignore webkitdirectory standard on modern browsers
        webkitdirectory=""
        directory=""
        multiple
        style={{ display: 'none' }}
        onChange={handleFolderChange}
      />
      <input
        ref={zipInputRef}
        type="file"
        accept=".zip"
        style={{ display: 'none' }}
        onChange={handleZipChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.htm,.css,.js,.svg,.png,.jpg,.jpeg,.json"
        multiple
        style={{ display: 'none' }}
        onChange={handleFolderChange}
      />

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragActive ? '#3b82f6' : '#2a2a2a'}`,
          borderRadius: '10px',
          padding: '36px 20px',
          textAlign: 'center',
          background: dragActive ? 'rgba(59,130,246,0.05)' : '#111',
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
        }}
        onClick={() => folderInputRef.current?.click()}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: '#1a1a1a',
            border: '1px solid #333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
          }}
        >
          {reading ? (
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} color="#60a5fa" />
          ) : (
            <UploadCloud size={24} color="#60a5fa" />
          )}
        </div>

        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#eee', marginBottom: '4px' }}>
            {reading ? 'Reading & optimizing project files...' : 'Drag & Drop HTML File, Folder, or .ZIP here'}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            or choose a selection method below:
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: '#1f1f1f',
              border: '1px solid #333',
              color: '#fff',
              padding: '7px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FileCode size={14} color="#60a5fa" />
            <span>Select HTML / Files</span>
          </button>
          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            style={{
              background: '#1f1f1f',
              border: '1px solid #333',
              color: '#fff',
              padding: '7px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Folder size={14} />
            <span>Select Folder</span>
          </button>
          <button
            type="button"
            onClick={() => zipInputRef.current?.click()}
            style={{
              background: '#1f1f1f',
              border: '1px solid #333',
              color: '#fff',
              padding: '7px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Archive size={14} />
            <span>Select .ZIP Archive</span>
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '10px 14px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#f87171',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Selected files summary & deploy action */}
      {files.length > 0 && (
        <div
          style={{
            background: '#121212',
            border: '1px solid #262626',
            borderRadius: '10px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={14} color="#10b981" />
                <span>Ready to deploy {files.length} files</span>
              </div>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                Total payload size: {formatBytes(totalSize)} (node_modules skipped)
              </div>
            </div>
            <button
              onClick={() => {
                setFiles([]);
                setProjectName('');
                setDetectedEnvExample(null);
                setCustomEnv('');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#888',
                fontSize: '12px',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Clear
            </button>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px' }}>
              Project Name:
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. my-cool-app"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: '#0a0a0a',
                border: '1px solid #333',
                borderRadius: '6px',
                color: '#fff',
                padding: '8px 12px',
                fontSize: '13px',
              }}
            />
          </div>

          {/* Environment variables inspector/toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowEnvEditor(!showEnvEditor)}
              style={{
                background: 'none',
                border: 'none',
                color: '#3b82f6',
                fontSize: '12px',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {showEnvEditor ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              {detectedEnvExample
                ? 'Detected .env.example configuration (Click to edit)'
                : 'Configure Environment Variables (.env)'}
            </button>

            {showEnvEditor && (
              <div style={{ marginTop: '8px' }}>
                <textarea
                  rows={4}
                  value={customEnv}
                  onChange={(e) => setCustomEnv(e.target.value)}
                  placeholder="KEY=VALUE&#10;NEXT_PUBLIC_API_URL=https://api.example.com"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#080808',
                    border: '1px solid #333',
                    borderRadius: '6px',
                    color: '#a7f3d0',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    padding: '8px 10px',
                    resize: 'vertical',
                  }}
                />
              </div>
            )}
          </div>

          <button
            onClick={handleDeploy}
            disabled={isDeploying || files.length === 0}
            style={{
              background: '#fff',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 16px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: isDeploying ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'opacity 0.2s',
              opacity: isDeploying ? 0.7 : 1,
            }}
          >
            {isDeploying ? (
              <>
                <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Deploying Sandbox...</span>
              </>
            ) : (
              <>
                <Zap size={15} />
                <span>Deploy Folder to Sandbox</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
