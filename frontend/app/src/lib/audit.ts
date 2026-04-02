export function formatAuditMessage(message: string): string {
  const ts = new Date().toISOString().substring(11, 19) + "Z";
  return `→ ${ts} ${message}`;
}
