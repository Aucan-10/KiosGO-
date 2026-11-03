// Búsqueda sin distinguir mayúsculas ni tildes: "jamon" encuentra "Jamón".

export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

// Devuelve true si el texto contiene la búsqueda (o si no hay búsqueda)
export function matchesSearch(text: string, query: string): boolean {
  const term = normalizeText(query.trim());
  if (!term) return true;
  return normalizeText(text).includes(term);
}
