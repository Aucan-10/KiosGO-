// Mensajes de error y validaciones compartidos por las pantallas de autenticación.

// Traduce los errores de Supabase Auth (en inglés) a mensajes claros en español.
export function translateAuthError(message: string | undefined | null): string {
  const text = (message ?? '').toLowerCase();

  if (text.includes('invalid login credentials')) return 'Email o contraseña incorrectos.';
  if (text.includes('email not confirmed')) return 'Tenés que confirmar tu email antes de ingresar.';
  if (text.includes('user already registered') || text.includes('already been registered')) {
    return 'Ya existe una cuenta con ese email.';
  }
  if (text.includes('password should be at least')) return 'La contraseña es demasiado corta.';
  if (text.includes('should be different from the old password')) {
    return 'La nueva contraseña tiene que ser distinta a la anterior.';
  }
  if (text.includes('invalid format') || text.includes('unable to validate email')) {
    return 'El email no es válido.';
  }
  if (text.includes('rate limit') || text.includes('for security purposes')) {
    return 'Hiciste demasiados intentos. Esperá unos minutos e intentá de nuevo.';
  }
  if (text.includes('auth session missing') || text.includes('session_not_found')) {
    return 'Tu sesión venció. Volvé a iniciar sesión.';
  }
  if (text.includes('failed to fetch') || text.includes('network request failed')) {
    return 'Sin conexión. Revisá tu internet e intentá de nuevo.';
  }
  return 'Ocurrió un error. Intentá de nuevo.';
}

// Validación simple de email: algo@dominio.ext, sin espacios
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_NAME_LENGTH = 60;
