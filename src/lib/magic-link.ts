import crypto from "crypto";

export function generateMagicToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function magicLinkExpiry(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d;
}

export function buildMagicUrl(ref: string, token: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/quote/${encodeURIComponent(ref)}/edit?token=${token}`;
}

export function buildAccountsUrl(ref: string, accountsToken: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/quote/${encodeURIComponent(ref)}/accounts?token=${accountsToken}`;
}

// Hash bound to the magic token — no separate secret needed.
// Used to verify the email-confirmation cookie without storing the raw email.
export function verificationHash(token: string, email: string): string {
  return crypto
    .createHash("sha256")
    .update(`${token}:${email.toLowerCase().trim()}`)
    .digest("hex");
}
