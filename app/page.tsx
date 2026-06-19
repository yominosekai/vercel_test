'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  download_url: string;
  type: string;
}

export default function Home() {
  const [files, setFiles] = useState<GitHubFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchFiles = useCallback(async () => {
    const res = await fetch('/api/files');
    if (res.ok) {
      const data = await res.json();
      setFiles(Array.isArray(data) ? data.filter((f: GitHubFile) => f.type === 'file') : []);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, [fetchFiles]);

  const pollDeployment = useCallback((sha: string, attempt = 0) => {
    const MAX = 36; // 6分
    pollRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/deploy-status?sha=${sha}`);
        const data = await res.json();

        if (data.ready) {
          setDeploying(false);
          setMessage({ text: '✅ Vercel デプロイ完了！ファイルが公開されました', ok: true });
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('デプロイ完了！', { body: 'Vercel へのデプロイが完了しました' });
          }
          return;
        }

        if (data.state === 'failure' || data.state === 'error') {
          setDeploying(false);
          setMessage({ text: '❌ Vercel デプロイ失敗', ok: false });
          return;
        }

        if (attempt < MAX) {
          pollDeployment(sha, attempt + 1);
        } else {
          setDeploying(false);
        }
      } catch {
        if (attempt < MAX) pollDeployment(sha, attempt + 1);
      }
    }, 10000);
  }, []);

  const upload = async (file: File) => {
    if (pollRef.current) clearTimeout(pollRef.current);
    setUploading(true);
    setDeploying(false);
    setMessage({ text: `"${file.name}" をアップロード中...`, ok: true });
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    if (res.ok) {
      const data = await res.json();
      setMessage({ text: `✓ GitHub にプッシュしました。Vercel デプロイ待機中...`, ok: true });
      setDeploying(true);
      await fetchFiles();
      if (data.commitSha) pollDeployment(data.commitSha);
    } else {
      const err = await res.json();
      setMessage({ text: `エラー: ${err.error}`, ok: false });
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const deleteFile = async (file: GitHubFile) => {
    if (!confirm(`"${file.name}" を削除しますか？`)) return;
    const res = await fetch('/api/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: file.path, sha: file.sha }),
    });
    if (res.ok) {
      setMessage({ text: `✓ "${file.name}" を削除しました`, ok: true });
      await fetchFiles();
    } else {
      const err = await res.json();
      setMessage({ text: `エラー: ${err.error}`, ok: false });
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) await upload(file);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">ファイルマネージャー</h1>
        <p className="text-sm text-gray-400 mb-6">
          ファイルをアップロードすると GitHub にコミットされ、Vercel が自動デプロイします
        </p>

        {/* Upload Zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer mb-4 transition-colors select-none ${
            dragging
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 bg-white hover:border-blue-300 hover:bg-blue-50/30'
          } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <p className="text-4xl mb-2">+</p>
          <p className="text-gray-500">ここにファイルをドロップ</p>
          <p className="text-gray-400 text-sm mt-1">またはクリックして選択</p>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) upload(e.target.files[0]); }}
          />
        </div>

        {/* Status Message */}
        {message && (
          <div className={`rounded-lg px-4 py-3 mb-2 text-sm ${
            message.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Deploy Progress Indicator */}
        {deploying && (
          <div className="rounded-lg px-4 py-3 mb-4 text-sm bg-blue-50 text-blue-700 flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
            </svg>
            Vercel デプロイ中... 完了時にここと通知でお知らせします
          </div>
        )}

        {/* File List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-600">
              アップロード済み ({files.length} 件)
            </h2>
            <button
              onClick={fetchFiles}
              className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
            >
              更新
            </button>
          </div>
          {files.length === 0 ? (
            <div className="py-14 text-center text-gray-400 text-sm">
              ファイルがありません
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {files.map((file) => (
                <li key={file.sha} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl shrink-0">📄</span>
                    <div className="min-w-0">
                      <a
                        href={file.download_url}
                        className="text-sm font-medium text-blue-600 hover:underline truncate block"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {file.name}
                      </a>
                      <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteFile(file)}
                    className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 shrink-0 ml-2 transition-colors"
                  >
                    削除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
