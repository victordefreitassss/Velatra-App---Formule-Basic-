export interface PublicContactSubmission {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export function validatePublicContact(body: unknown): PublicContactSubmission | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const input = body as Record<string, unknown>;
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const subject = typeof input.subject === 'string' ? input.subject.trim() : '';
  const message = typeof input.message === 'string' ? input.message.trim() : '';
  if (name.length < 2 || name.length > 100 || email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || subject.length < 2 || subject.length > 120 ||
    /[\r\n]/.test(subject) || message.length < 5 || message.length > 5000) return null;
  return { name, email, subject, message };
}
