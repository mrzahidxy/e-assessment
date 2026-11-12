# e-assessment client

Next.js frontend for e-assessment.

## Setup

1. From `client/`, install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL` to the API URL (default: `http://localhost:8080/api`).
3. Start the API, then run `npm run dev` and open http://localhost:3000.

The client sends authentication cookies with API requests. Media uploads use the API's Cloudinary upload endpoint; configure Cloudinary in the API environment.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` / `npm start` | Build and run the production server |
| `npm run lint` | Run ESLint |
