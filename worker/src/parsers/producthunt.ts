import type { ParseResult, RawDiscovery } from "./types";

const GRAPHQL_ENDPOINT = "https://api.producthunt.com/v2/api/graphql";

const QUERY = `
  query GetPosts($first: Int!) {
    posts(order: NEWEST, first: $first) {
      edges {
        node {
          name
          tagline
          description
          url
          website
          votesCount
          createdAt
          topics {
            edges {
              node {
                name
              }
            }
          }
          makers {
            name
          }
        }
      }
    }
  }
`;

export async function parseProductHunt(
  config: Record<string, unknown>
): Promise<ParseResult> {
  const token = process.env.PRODUCTHUNT_TOKEN;
  if (!token) {
    return { discoveries: [], errors: ["PRODUCTHUNT_TOKEN not set"] };
  }

  const errors: string[] = [];
  const discoveries: RawDiscovery[] = [];
  const limit = (config.limit as number) || 50;

  try {
    const res = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: QUERY, variables: { first: limit } }),
    });

    if (!res.ok) {
      return {
        discoveries: [],
        errors: [`Product Hunt API ${res.status}: ${res.statusText}`],
      };
    }

    const data = await res.json();
    const posts = data?.data?.posts?.edges || [];

    for (const edge of posts) {
      const node = edge.node;
      const topics = (node.topics?.edges || []).map(
        (t: { node: { name: string } }) => t.node.name
      );
      const maker = node.makers?.[0]?.name || null;

      discoveries.push({
        title: node.name,
        url: node.website || node.url,
        description: node.tagline
          ? `${node.tagline}. ${node.description || ""}`
          : node.description || undefined,
        author: maker,
        publishedAt: node.createdAt ? new Date(node.createdAt) : undefined,
        techStack: topics,
        upvotes: node.votesCount,
      });
    }
  } catch (err) {
    errors.push(
      `Product Hunt fetch error: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return { discoveries, errors };
}
