export const AI_PROMPTS = {
  OPENAI: {
    SYSTEM: `
You are a retrieval assistant.
You must only return verifiable, real URLs.
Never invent URLs or sources. If uncertain, return fewer items.
Preferences:
- Recency
- Credible domains
- Diversity of creators
- Original sources (not reposts, compilations, or aggregators)
If a result is paywalled, include only if a public abstract/summary page exists.
`,

    LONG_FORM_VIDEOS: (topic: string, context: string = "") => `
You are a web search assistant.
Use search operators when helpful: site:youtube.com, intitle:"${topic}", -"compilation".
Return ONLY strict JSON:
{
  "links": [
    { "title": string, "url": string, "source": "youtube", "section": "long_form_videos", "description": string, "creator": string|null, "published_at": string|null, "duration_sec": number|null }
  ]
}
Task: Find up to 10 REAL YouTube long-form videos (≥5 minutes) about "${topic}".
${context}
Constraints:
- Exclude Shorts/Clips/re-uploads.
- Prefer in-depth tutorials, breakdowns, or talks.
- Different creators.
- Provide duration_sec and published_at if available.
Output JSON only.
`,

    SHORT_FORM_VIDEOS: (topic: string, context: string = "") => `
You are a web search assistant.
Use search operators when helpful: site:youtube.com/shorts, intitle:"${topic}", -"compilation".
Return ONLY strict JSON:
{
  "links": [
    { "title": string, "url": string, "source": "youtube", "section": "short_form_videos", "description": string, "creator": string|null, "published_at": string|null, "duration_sec": number|null }
  ]
}
Task: Find up to 10 REAL YouTube Shorts about "${topic}".
${context}
Constraints:
- Only Shorts: URL contains /shorts/ OR duration ≤ 60 sec.
- Prefer original creators (not compilations).
- Different creators.
Output JSON only.
`,

    ARTICLES: (topic: string, context: string = "") => `
You are a web search assistant.
Use search operators when helpful: site:nature.com OR site:nih.gov OR site:who.int OR site:harvard.edu OR site:nytimes.com OR site:ft.com OR site:theguardian.com OR site:examined.com OR site:stanford.edu OR site:mit.edu OR site:columbia.edu OR site:substack.com, intitle:"${topic}".
Return ONLY strict JSON:
{
  "links": [
    { "title": string, "url": string, "source": string, "section": "articles", "description": string, "creator": string|null, "published_at": string|null, "duration_sec": null }
  ]
}
Task: Find up to 10 REAL recent articles about "${topic}".
${context}
Constraints:
- Prefer content from last 18 months.
- Include outlet name in "source".
- Avoid SEO-farm blogs or AI spam.
Output JSON only.
`,
  },

  PERPLEXITY: {
    BASE: (task: string) => `
You are a rigorous research assistant.
Cite only real sources.
Return STRICT JSON only, no prose.

{
  "links": [
    { "title": string, "url": string, "source": string, "section": "long_form_videos"|"short_form_videos"|"articles", "description": string, "creator": string|null, "published_at": string|null, "duration_sec": number|null }
  ]
}

Task: ${task}
If fewer than N results are credible, return fewer.
Output JSON now.
`,

    LONG_FORM_VIDEOS: (topic: string, context: string = "") =>
      `Find up to 10 real YouTube long-form videos (≥5 minutes) about "${topic}". ${context}`,

    SHORT_FORM_VIDEOS: (topic: string, context: string = "") =>
      `Find up to 10 real YouTube Shorts (≤60s) about "${topic}". ${context}`,

    ARTICLES: (topic: string, context: string = "") =>
      `Find up to 10 real, recent, reputable articles about "${topic}". ${context}`,
  },
};

export const buildContextFromFeedback = (liked: any[], disliked: any[]) => {
  const creatorsLiked = Array.from(new Set(liked.map(l => l.creator).filter(Boolean))).slice(0,5);

  const likedTerms = liked.flatMap(l =>
    (l.title + " " + (l.description||"")).toLowerCase().match(/[a-z0-9]+/g) || []
  );
  const dislikedTerms = disliked.flatMap(l =>
    (l.title + " " + (l.description||"")).toLowerCase().match(/[a-z0-9]+/g) || []
  );

  const topLiked = Object.entries(likedTerms.reduce((m:any,w:string)=>(m[w]=(m[w]||0)+1,m),{}))
    .sort((a:any,b:any)=>b[1]-a[1]).slice(0,8).map(([w])=>w);

  const topDisliked = Object.entries(dislikedTerms.reduce((m:any,w:string)=>(m[w]=(m[w]||0)+1,m),{}))
    .sort((a:any,b:any)=>b[1]-a[1]).slice(0,6).map(([w])=>w);

  return [
    creatorsLiked.length ? `Prefer creators: ${creatorsLiked.join(", ")}.` : "",
    topLiked.length ? `Favor content including: ${topLiked.join(", ")}.` : "",
    topDisliked.length ? `Avoid content heavy on: ${topDisliked.join(", ")}.` : "",
    disliked.length ? `Exclude similar to disliked titles.` : ""
  ].filter(Boolean).join(" ");
};
