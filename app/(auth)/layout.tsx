import { redirect } from 'next/navigation';

import { getValidatedServerSession } from '@/lib/auth';
import React from "react";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await getValidatedServerSession();
  if (session) {
    redirect('/');
  }

  return <div className="auth-page">{children}</div>;
}
