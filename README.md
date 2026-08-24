# PanelVerse Complete MVP 1.0

This package consolidates the platform plan into one runnable starter.

## Included
- Account registration/login with bcrypt + JWT
- Creator ownership/security
- Creator Studio
- Series creation
- Cover + up to 100 chapter-page image uploads
- Draft/publish workflow
- Webtoon/manga reader
- Likes, follows, bookmarks
- Comments
- Reading history
- Notifications endpoint
- Discovery: featured/trending/new releases
- Search
- Personalized recommendation endpoint
- Creator profiles
- Creator analytics: series, chapters, followers, likes, views, comments
- User reporting
- Admin stats/report endpoints
- External-platform catalog links
- Mobile-first frontend

## Run
1. Install Node.js 20+
2. `npm install`
3. `npm start`
4. Open `public/index.html`

## Important production upgrades
This is a complete functional starter, not a production deployment. Before accepting real users:
- PostgreSQL or another production database
- S3/R2-style object storage + CDN
- Strong `JWT_SECRET` environment variable
- HTTPS
- Email verification + password reset
- CSRF/session hardening and rate limits
- Image resizing/optimization and malware scanning
- Creator verification
- Professional moderation and copyright/takedown workflow
- Payment provider for monetization
- Backups and monitoring
- Official APIs/embeds/licensing for external-platform content

External-platform items should remain links, permitted embeds, official APIs, or licensed integrations; do not mirror copyrighted chapters without permission.


## Deploy on Render

This project now serves `public/index.html` from the Node server, so the root URL opens the PanelVerse UI.

1. Push this repository to GitHub.
2. In Render, create a Web Service from the GitHub repository.
3. Use:
   - Build command: `npm install`
   - Start command: `npm start`
4. Add `JWT_SECRET` as a secret environment variable, or use the included `render.yaml`.
5. Deploy and open the generated HTTPS URL.

### Production warning
The MVP still uses local JSON storage and local uploads. For a real public launch, migrate the database to PostgreSQL and uploads to persistent object storage/CDN. Otherwise redeployments can lose uploaded data.
