import type { NextApiRequest, NextApiResponse } from 'next';
import { Server as IOServer } from 'socket.io';

import { getDormRoom, setSocketServer } from '@/lib/socket-server';

type NextApiResponseWithIO = NextApiResponse & { socket: any };

export function ensureSocketServer(res: NextApiResponseWithIO): IOServer {
  if (!res.socket.server.io) {
    const io = new IOServer(res.socket.server as any, {
      path: '/api/socket',
      addTrailingSlash: false,
    });

    io.on('connection', (socket) => {
      socket.on('join', (dormId: number) => {
        if (typeof dormId === 'number') {
          socket.join(getDormRoom(dormId));
        }
      });
    });

    setSocketServer(io);
    res.socket.server.io = io;
  }
  return res.socket.server.io as IOServer;
}

export default function handler(_req: NextApiRequest, res: NextApiResponseWithIO) {
  ensureSocketServer(res);

  res.end();
}
