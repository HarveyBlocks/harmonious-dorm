import type { Server as IOServer } from 'socket.io';

declare global {
  var __io: IOServer | undefined;
}

function roomOfDorm(dormId: number): string {
  return `dorm:${dormId}`;
}

export function setSocketServer(io: IOServer) {
  globalThis.__io = io;
}

export function emitToDorm(dormId: number, event: string, payload: unknown) {
  globalThis.__io?.to(roomOfDorm(dormId)).emit(event, payload);
}

export function getDormRoom(dormId: number): string {
  return roomOfDorm(dormId);
}
