import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TransactionPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/transactions/${id}/overview`);
}
