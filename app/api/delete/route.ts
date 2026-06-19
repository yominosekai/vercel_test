import { NextRequest, NextResponse } from 'next/server';

const OWNER = 'yominosekai';
const REPO = 'vercel_test';

export async function DELETE(req: NextRequest) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'GITHUB_TOKEN が設定されていません' }, { status: 500 });
  }

  const { path, sha } = await req.json();

  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Delete: ${(path as string).split('/').pop()}`,
        sha,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    return NextResponse.json({ error: err.message ?? '削除失敗' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
