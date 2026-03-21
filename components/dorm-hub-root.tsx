'use client';

import React from 'react';

import { useHubPageModel } from '@/components/dorm-hub/hooks/use-hub-page-model';
import { HubLayout } from '@/components/dorm-hub/layout/hub-layout';

export default function DormHubRoot() {
  const layoutProps = useHubPageModel();
  return <HubLayout {...layoutProps} />;
}
