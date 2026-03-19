import { redirect } from 'next/navigation';

import { getValidatedServerSession } from '@/lib/auth';
import React from 'react';
import DormHubRoot from '@/components/dorm-hub-root';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getValidatedServerSession();
  if (!session) {
    redirect('/login');
  }

  void children;
  return <DormHubRoot />;
}



