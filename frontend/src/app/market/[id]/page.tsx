import MarketDetailPageClient from './MarketDetailPageClient';

// Required for Next.js output: 'export'
// We return a dummy static param so it exports correctly for our .htaccess SPA rewrite
export function generateStaticParams() {
  return [{ id: 'index' }];
}

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  
  return <MarketDetailPageClient id={id} />;
}
