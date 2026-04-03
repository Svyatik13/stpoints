import ProfilePageClient from './ProfilePageClient';

export function generateStaticParams() {
  return [{ handle: 'index' }];
}

export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const resolvedParams = await params;
  const rawHandle = resolvedParams.handle || '';
  const handle = rawHandle.replace(/^@/, '');
  
  return <ProfilePageClient handle={handle} />;
}
