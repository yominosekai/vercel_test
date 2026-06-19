import { NextRequest, NextResponse } from 'next/server';

const OWNER = 'yominosekai';
const REPO = 'vercel_test';

export async function GET(req: NextRequest) {
  const token = process.env.GITHUB_TOKEN;
  const sha = req.nextUrl.searchParams.get('sha');
  if (!sha) return NextResponse.json({ state: 'unknown' });

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
  };

  // Vercel が GitHub Deployments API を通じて作成したデプロイを取得
  const dRes = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/deployments?sha=${sha}&per_page=5`,
    { headers, cache: 'no-store' }
  );
  if (!dRes.ok) return NextResponse.json({ state: 'pending' });

  const deployments = await dRes.json();
  if (!Array.isArray(deployments) || deployments.length === 0) {
    return NextResponse.json({ state: 'pending' });
  }

  // 最新のデプロイメントのステータスを確認
  const dep = deployments[0];
  const sRes = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/deployments/${dep.id}/statuses?per_page=1`,
    { headers, cache: 'no-store' }
  );
  if (!sRes.ok) return NextResponse.json({ state: 'pending' });

  const statuses = await sRes.json();
  const latest = Array.isArray(statuses) ? statuses[0] : null;

  return NextResponse.json({
    state: latest?.state ?? 'pending',
    ready: latest?.state === 'success',
    environment: dep.environment,
    deployUrl: latest?.target_url ?? null,
  });
}
