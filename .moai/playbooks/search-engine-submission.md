# Search Engine Submission Playbook

The site infrastructure is ready. Two 15-minute owner steps unlock all
the SEO work in PRs #83 and #84.

## 1. Google Search Console (10 minutes)

1. Sign in to https://search.google.com/search-console with the Google
   account that should own the property.
2. Click **속성 추가** → **도메인** → enter `nedabah.org`.
3. Google will display a TXT record like:
   ```
   google-site-verification=ABCDEF...XYZ
   ```
   Add it as a TXT record on the `nedabah.org` DNS zone (the registrar
   where the domain was bought — Cafe24, Gabia, Cloudflare, etc.).
4. Wait 1-2 minutes, click **확인**. Property verified.
5. Left sidebar → **Sitemaps** → submit these two:
   - `sitemap.xml`
   - `news-sitemap.xml`
6. Left sidebar → **URL 검사** → for each of these key URLs, click
   **색인 생성 요청** (forces immediate crawl, not the days-long default):
   - `https://www.nedabah.org/`
   - `https://www.nedabah.org/start.html`
   - `https://www.nedabah.org/p/`
   - `https://www.nedabah.org/p/starcp.html`
   - `https://www.nedabah.org/p/iden-teacher.html`
   - `https://www.nedabah.org/p/iden-career.html`
   - `https://www.nedabah.org/p/changjig.html`
   - `https://www.nedabah.org/p/5s-leadership.html`
   - `https://www.nedabah.org/author/`
   - The 5 pillar URLs at `https://www.nedabah.org/blog/posts/2026-05-19_pillar-*.html`

**If domain-level verification doesn't work**, use HTML-file
verification instead: Google gives a file like
`google0123456789abcdef.html`. Tell me the filename and I will commit it
to the repo root in one command.

## 2. Naver Webmaster Tools (5 minutes)

Naver carries the dominant share of Korean search. Critical for the
target audience.

1. Sign in to https://searchadvisor.naver.com with the Naver account.
2. **사이트 등록** → enter `https://www.nedabah.org`.
3. Naver offers either an HTML file or an HTML meta tag for
   verification. Tell me which method you choose:
   - **HTML file**: Naver gives a file like
     `naver1234567890abcdef.html`. Send me the filename — I commit it.
   - **Meta tag**: Naver gives a tag like
     `<meta name="naver-site-verification" content="...">`. Send me
     the content string — I add the tag to `index.html`'s `<head>`.
4. After verification: left sidebar → **요청** → **사이트맵 제출** →
   submit `https://www.nedabah.org/sitemap.xml`.
5. **RSS 제출** → submit `https://www.nedabah.org/blog/feed.xml` and
   `https://www.nedabah.org/blog/perspective/feed.xml`.

## 3. After verification — measurement loop

Within 1-2 weeks both consoles will start showing real data:
- Which queries are surfacing the site.
- Click-through rate per page.
- Index coverage issues, if any.

Send the screenshots / exported CSV and I will adjust title tags,
meta descriptions, and topic priorities based on the actual queries
people are typing — that is when the next round of content sharpens
toward real demand instead of guessed intent.

## Quick checklist

- [ ] Google Search Console verified.
- [ ] `sitemap.xml` and `news-sitemap.xml` submitted to Google.
- [ ] Top 12 URLs requested for indexing manually.
- [ ] Naver Webmaster verified.
- [ ] `sitemap.xml` submitted to Naver.
- [ ] RSS feeds submitted to Naver.
- [ ] (After 2 weeks) review which queries are surfacing — share with me.
