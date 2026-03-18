import { redirect } from 'next/navigation';

import { getValidatedServerSession } from '@/lib/auth';
import DormApp from '@/components/dorm-app';
import React from "react";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getValidatedServerSession();
  if (!session) {
    redirect('/login');
  }

  void children;
  return <DormApp />;
}

