export function personalEmailAllowed(email: unknown): boolean {
  const allowed = process.env.PERSONAL_ACCESS_EMAIL?.trim().toLowerCase();
  if (!allowed) return true;
  return typeof email === 'string' && email.trim().toLowerCase() === allowed;
}
