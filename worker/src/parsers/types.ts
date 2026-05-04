export type RawDiscovery = {
  title: string;
  url: string;
  description?: string;
  author?: string;
  publishedAt?: Date;
  techStack?: string[];
  stars?: number;
  upvotes?: number;
};

export type ParseResult = {
  discoveries: RawDiscovery[];
  errors: string[];
};
