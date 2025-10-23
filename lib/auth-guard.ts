// delmas-app/lib/auth-guard.ts

/**
 * Liste des emails autorisés à accéder à l'application
 */
const ALLOWED_EMAILS = [
  'oppsyste@gmail.com',
  'stephanedelmas69@gmail.com',
  'christophemenoire@gmail.com'
];

/**
 * Vérifie si l'utilisateur est autorisé
 */
export function isAuthorizedUser(email: string | undefined): boolean {
  if (!email) return false;
  return ALLOWED_EMAILS.includes(email.toLowerCase());
}

/**
 * Vérifie si l'utilisateur est admin
 */
export function isAdmin(email: string | undefined): boolean {
  return email?.toLowerCase() === 'oppsyste@gmail.com';
}
