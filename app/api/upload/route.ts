import { NextRequest, NextResponse } from 'next/server';

const OWNER = 'yominosekai';
const REPO = 'vercel_test';
const UPLOAD_DIR = 'uploads';

export async function POST(req: NextRequest) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'GITHUB_TOKEN が設定されていません' }, { status: 500 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'ファイルが指定されていません' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString('base64');
  const path = `${UPLOAD_DIR}/${file.name}`;

  // ファイルが既に存在する場合は SHA が必要
  let sha: string | undefined;
  const checkRes = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  );
  if (checkRes.ok) {
    const existing = await checkRes.json();
    sha = existing.sha;
  }

  const body: Record<string, string> = {
    message: `Upload: ${file.name}`,
    content: base64,
  };
  if (sha) body.sha = sha;

  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    return NextResponse.json({ error: err.message ?? 'アップロード失敗' }, { status: 500 });
  }

  const data = await res.json();
  return NextResponse.json({ success: true, commitSha: data.commit?.sha ?? null });
}
