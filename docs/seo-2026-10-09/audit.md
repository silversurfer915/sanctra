# Sanctra SEO audit — October 9, 2026

## Scope and findings

Reviewed the published landing page, generated HTML, metadata, public routes, sitemap and crawl behavior using Impeccable's audit workflow and Google's Search documentation. Preserved the existing landing design and demos.

- High priority: search intent was concentrated on one homepage. Added useful public pages for Pomodoro timer and group study timer searches, with crawlable links from the landing page and between pages.
- High priority: title and description did not clearly explain the product. Updated homepage metadata and added unique titles, descriptions, canonical URLs and social metadata for each public page.
- Medium priority: the sitemap only listed the homepage. It now includes both topic pages and privacy.
- Medium priority: unknown URLs returned the homepage with HTTP 200. Removed the catch-all rewrite and added a genuine 404 page to reduce duplicate/soft-404 responses. The app uses the root URL and query parameters; those remain supported.
- Medium priority: public reading pages booted the full app. Topic and privacy pages are now prerendered HTML with styles and native FAQ interactions, without app module scripts or Firebase initialization.
- Medium priority: React emitted redundant image preload tags. The homepage now preloads one hero poster; topic pages avoid redundant preloads.

## Structured data

Homepage: WebSite, Organization and WebApplication. Topic pages: WebPage and BreadcrumbList. No fabricated reviews or ratings. This does not claim eligibility for Google's software-app rich results or guarantee a rich result.

## Verification

- Production build and `npm run check:seo` passed for all four public pages.
- Checked self-canonicals, unique metadata, one H1 per page, parseable JSON-LD, sitemap coverage, stylesheet inclusion and script removal from static reading pages.
- Desktop at 1280px and mobile at 390px: topic pages render correctly; group FAQ opens; navigation to Pomodoro works; no horizontal overflow on the checked group layouts.
- Impeccable deterministic detector passed. Existing advisory palette differences were not treated as regressions or used to replace dynamic theming.
- Core Web Vitals and Lighthouse scores were not measured; no numerical performance claim is made.
- Firebase Hosting deployment completed. Live checks confirmed HTTP 200 for the homepage, both topic pages, privacy and sitemap; correct canonicals; one H1 per page; and HTTP 404 for an unknown URL. The published group page was also checked in the browser. A Googlebot user-agent request returned 200, but this does not prove access from Google's real crawler.

## Search visibility and remaining work

A `site:sanctrastudy.live` search lookup returned no Sanctra result. That is not authoritative evidence of index status. Google Search Console is required to inspect coverage, canonical selection and indexing errors.

Next owner step: verify the domain in Search Console, submit `https://sanctrastudy.live/sitemap.xml`, and request indexing of the homepage and both topic pages. Monitor impressions and queries after crawling. Useful original content, real recommendations and credible relevant links will matter for competitive generic searches; code changes cannot guarantee first position.

Sources:

- https://developers.google.com/search/docs/appearance/title-link
- https://developers.google.com/search/docs/appearance/snippet
- https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- https://developers.google.com/search/docs/appearance/structured-data/software-app
- https://developers.google.com/search/docs/fundamentals/get-started-developers
