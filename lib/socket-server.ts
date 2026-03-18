import type { Server as IOServer } from 'socket.io';

declare global {
    let __io: IOServer | undefined;
}

function roomOfDorm(dormId: number): string {
  return `dorm:${dormId}`;
}

export function setSocketServer(io: IOServer) {
  global.__io = io;
}

export function emitToDorm(dormId: number, event: string, payload: unknown) {
  global.__io?.to(roomOfDorm(dormId)).emit(event, payload);
}

export function getDormRoom(dormId: number): string {
  return roomOfDorm(dormId);
}