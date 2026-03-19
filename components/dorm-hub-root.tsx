'use client';

import React from 'react';

import { useDormHubPageModel } from '@/components/dorm-hub/hooks/use-dorm-hub-page-model';
import { DormHubLayout } from '@/components/dorm-hub/layout/dorm-hub-layout';

export default function DormHubRoot() {
  const layoutProps = useDormHubPageModel();
  return <DormHubLayout {...layoutProps} />;
}
