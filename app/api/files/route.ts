import { NextResponse } from 'next/server';

const OWNER = 'yominosekai';
const REPO = 'vercel_test';
const UPLOAD_DIR = 'uploads';

export async function GET() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'GITHUB_TOKEN が設定されていません' }, { status: 500 });
  }

  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${UPLOAD_DIR}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
      cache: 'no-store',
    }
  );

  if (res.status === 404) {
    return NextResponse.json([]);
  }

  if (!res.ok) {
    return NextResponse.json({ error: 'GitHub API エラー' }, { status: 500 });
  }

  const data = await res.json();
  return NextResponse.json(Array.isArray(data) ? data : []);
}
