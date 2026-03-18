import { redirect } from 'next/navigation';

import { getValidatedServerSession } from '@/lib/auth';
import LegacyDormApp from '@/components/legacy-dorm-app';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getValidatedServerSession();
  if (!session) {
    redirect('/login');
  }

  void children;
  return <LegacyDormApp />;
}
