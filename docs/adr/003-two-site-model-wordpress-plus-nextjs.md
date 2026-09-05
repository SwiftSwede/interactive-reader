# ADR 003: Two-Site Model (WordPress + Next.js)

## Context

profekyle.com is an existing WordPress site with blog articles that rank for SEO. It has 2,208 email subscribers, a 47% open rate, and established search authority. Migrating the blog to Next.js would lose SEO ranking and require rebuilding all content. The interactive reader is a separate product that needs a modern SPA framework (Next.js) for its interactive features (hover-to-translate, karaoke, pronunciation assessment, real-time exam sync).

## Decision

Keep WordPress at profekyle.com for blog content and SEO. Build the interactive reader as a separate Next.js app at learn.profekyle.com. WordPress links to the app. The app does not link back to WordPress for content. Two tools, two jobs.

## Consequences

- WordPress keeps its SEO authority and existing content workflow. No migration risk.
- The Next.js app is a clean PWA focused on the learning product, not a blog engine.
- profekyle.com links to learn.profekyle.com (free story, evaluation, course pages). learn.profekyle.com handles all authentication, payment, and learning features.
- DNS: both subdomains on the same domain. Vercel hosts the Next.js app. WordPress stays on its existing host.
- No WordPress data is fetched from the Next.js app. The two are decoupled.
