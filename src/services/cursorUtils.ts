export function encodeCursor(payload: { created_at: string | Date; id: number }) {
  const created = typeof payload.created_at === "string" ? payload.created_at : payload.created_at.toISOString();
  const raw = `${created}|${payload.id}`;
  return Buffer.from(raw).toString("base64");
}

export function decodeCursor(cursor?: string) {
  if (!cursor) return null;
  try {
    const raw = Buffer.from(cursor, "base64").toString("utf8");
    const [created_at, id] = raw.split("|");
    return { created_at, id: Number(id) };
  } catch (e) {
    return null;
  }
}