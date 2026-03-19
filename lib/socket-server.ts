import type { Server as IOServer } from 'socket.io';

type GlobalWithSocket = typeof globalThis & { __io?: IOServer };
const globalForSocket = globalThis as GlobalWithSocket;

function roomOfDorm(dormId: number): string {
  return `dorm:${dormId}`;
}

export function setSocketServer(io: IOServer) {
  globalForSocket.__io = io;
}

export function emitToDorm(dormId: number, event: string, payload: unknown) {
  globalForSocket.__io?.to(roomOfDorm(dormId)).emit(event, payload);
}

export function getDormRoom(dormId: number): string {
  return roomOfDorm(dormId);
}

