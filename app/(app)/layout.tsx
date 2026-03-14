import { redirect } from 'next/navigation';

import { getValidatedServerSession } from '@/lib/auth';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getValidatedServerSession();
  if (!session) {
    redirect('/login');
  }

  return <>{children}</>;
}
