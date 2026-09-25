function getNormalizedBasePath(): string {
  const base = import.meta.env.BASE_URL || "/";
  if (base === "./") return "/";
  return base.startsWith("/") ? base : `/${base}`;
}

export function getUrlRoomCode(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("room")?.trim().toUpperCase() || null;
}

export function getRoomRoutePath(roomCode?: string): string {
  const url = new URL(getNormalizedBasePath(), window.location.origin);
  if (roomCode) {
    url.searchParams.set("room", roomCode);
  }
  return `${url.pathname}${url.search}`;
}

export function getRoomInviteLink(roomCode: string): string {
  return new URL(getRoomRoutePath(roomCode), window.location.origin).toString();
}
