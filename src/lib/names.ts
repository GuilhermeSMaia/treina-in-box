interface NameParts {
  username?: string | null;
  last_name?: string | null;
}

/** Nome completo (nome + sobrenome), sem "null" quando faltar alguma parte. */
export function getFullName(person: NameParts | null | undefined, fallback = "Sem nome"): string {
  return [person?.username, person?.last_name].filter(Boolean).join(" ").trim() || fallback;
}

/** Até duas iniciais em maiúsculas (ex.: "Maria Souza" → "MS"). */
export function getInitials(name: string | null | undefined, fallback = "U"): string {
  const initials = (name ?? "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return initials || fallback;
}
