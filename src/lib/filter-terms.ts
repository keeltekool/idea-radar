export const REQUIRED_TERMS = [
  "built", "ship", "launch", "saas", "side project", "sideproject", "indie",
  "solo", "tool", "app", "platform", "startup", "maker", "product", "pricing",
  "users", "mvp", "marketplace", "booking", "tracker", "pwa", "mobile",
  "subscription", "revenue", "customers", "launched", "health", "fitness",
  "education", "fintech", "creative", "e-commerce", "community",
];

export const BLOCKED_TERMS = [
  "tutorial", "course", "beginner", "how to", "introduction to",
  "getting started", "boilerplate", "template repo", "awesome-list",
  "cheat sheet", "interview prep", "learn ", "roadmap to", "study guide",
  "library", "framework", "package", "npm ", "pip ", "docker",
  "kubernetes", "devops", "infrastructure", "benchmark", "linting",
  "eslint", "webpack", "vite plugin",
];

export function passesPreFilter(
  title: string,
  description: string | null
): boolean {
  const text = `${title} ${description || ""}`.toLowerCase();
  if (BLOCKED_TERMS.some((t) => text.includes(t))) return false;
  return REQUIRED_TERMS.some((t) => text.includes(t));
}
