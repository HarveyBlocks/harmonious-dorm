import type { NextApiRequest, NextApiResponse } from 'next';

import { ensureSocketServer } from './socket';

type NextApiResponseWithIO = NextApiResponse & { socket: any };

export default function handler(_req: NextApiRequest, res: NextApiResponseWithIO) {
  ensureSocketServer(res);
  res.status(200).json({ ok: true });
}
