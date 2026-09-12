export const REQUIRED_TERMS = [
  "built", "ship", "launch", "saas", "side project", "sideproject", "indie",
  "solo", "tool", "app", "platform", "startup", "maker", "product", "pricing",
  "users", "mvp", "marketplace", "booking", "tracker", "pwa", "mobile",
  "subscription", "revenue", "customers", "launched", "health", "fitness",
  "education", "fintech", "creative", "e-commerce", "community",
];

export const BLOCKED_TERMS = [
  // tutorials & learning
  "tutorial", "course", "beginner", "how to", "introduction to",
  "getting started", "boilerplate", "template repo", "awesome-list",
  "cheat sheet", "interview prep", "learn ", "roadmap to", "study guide",
  // dev-infra & libraries
  "library", "framework", "package", "npm ", "pip ", "docker",
  "kubernetes", "devops", "infrastructure", "benchmark", "linting",
  "eslint", "webpack", "vite plugin",
  // news & opinion
  "coming to", "is coming", "raises $", "raised $", "valuation",
  "series a", "series b", "series c", "funding round",
  "techcrunch", "disrupt", "road to battlefield",
  "five things i noticed", "weekly recap", "what i learned this week",
  // essays & meta
  "here's what i learned", "things i wish", "lessons from",
  "the real math behind", "the weekend build is real",
  "stop using", "why you should", "unpopular opinion",
  "hot take", "i quit my job", "my journey",
  // non-product discussions
  "looking for feedback", "advice?", "any founders",
  "what's the project you're most proud",
  "share your", "who else",
];

export function passesPreFilter(
  title: string,
  description: string | null
): boolean {
  const text = `${title} ${description || ""}`.toLowerCase();
  if (BLOCKED_TERMS.some((t) => text.includes(t))) return false;
  return REQUIRED_TERMS.some((t) => text.includes(t));
}
