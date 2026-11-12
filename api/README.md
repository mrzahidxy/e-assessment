# e-assessment API

Express and TypeScript API for the [e-assessment](../README.md), backed by PostgreSQL and Prisma.

## Getting started

From `api/`, install dependencies and copy the environment template:

```bash
npm install
cp .env.example .env
```

In PowerShell, use `Copy-Item .env.example .env` instead.

Configure these values in `.env`:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` / `DIRECT_URL` | PostgreSQL connection strings. For Neon, use pooled and direct URLs for a dedicated development branch. |
| `JWT_SECRET` | Signing secret of at least 16 characters. |
| `CORS_ORIGIN` | Allowed frontend origin; defaults to `http://localhost:3000`. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Cloudinary credentials, needed for media uploads. |

`npm install` generates Prisma Client. Start the server with `npm run dev`; it listens on `http://localhost:8080` by default.

> **Database migration note:** The checked-in migrations and the existing Neon branch history need reconciliation. Until then, do not run migrations, reset, schema push, or seed commands against that branch. These commands affect the database selected by the environment URLs.

For production, set `CORS_ORIGIN` to the exact frontend origins and `COOKIE_SECURE=true`. Cross-site cookies require HTTPS and `COOKIE_SAME_SITE=none`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` / `npm start` | Build and run the production server |
| `npm test` | Run API security tests |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:migrate` | Create and apply development migrations |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run seed` | Populate sample data |
| `npx prisma migrate status` | Inspect migration status |

## Project structure

- `src/routes`, `src/controllers`, and `src/services` contain the API routes, handlers, and business logic.
- `src/schemas` and `src/middleware` handle validation, authentication, and request processing.
- `prisma/` contains the schema, migrations, and seed script.

## Authentication

Registration and login set an HTTP-only access-token cookie; the client sends it with credentials. The API also accepts a bearer token. `ACCESS_TOKEN_TTL_MINUTES` controls token lifetime and defaults to 30 minutes. Admin and student routes enforce role-based access.

## API endpoints

Routes are available under `/api` and `/api/v1`; the examples below use `/api`. Swagger UI is available at `/api-docs`.

### Authentication Endpoints

| Method | Path                 | Description                                      | Auth |
| ------ | -------------------- | ------------------------------------------------ | ---- |
| POST   | `/api/auth/register` | Register a new student account                   | No   |
| POST   | `/api/auth/login`    | Log in and set the authentication cookie         | No   |
| POST   | `/api/auth/logout`   | Clear the authentication cookie                  | No   |
| GET    | `/api/auth/me`       | Retrieve the authenticated user's profile        | Yes  |

### Question Paper Management

| Method | Path                               | Description                                                        | Auth          |
| ------ | ---------------------------------- | ------------------------------------------------------------------ | ------------- |
| GET    | `/api/papers`                      | List papers (admins see all, students see approved published ones) | Yes           |
| GET    | `/api/papers/:paperId`             | Fetch a paper with nested questions + sub-questions                | Yes           |
| POST   | `/api/papers`                      | Create a paper with schedule, status, and optional questions       | Admin         |
| PATCH  | `/api/papers/:paperId`             | Update paper metadata and schedule                                | Admin         |
| POST   | `/api/papers/:paperId/questions`   | Append questions to a paper                                       | Admin         |
| PATCH  | `/api/papers/:paperId/questions`   | Update questions in a paper                                       | Admin         |

### Access Requests

| Method | Path                        | Description                                         | Auth                 |
| ------ | --------------------------- | --------------------------------------------------- | -------------------- |
| GET    | `/api/access-requests`      | List access requests (admins all, students see own) | Yes                  |
| POST   | `/api/access-requests`      | Students request access to a published paper        | Student              |
| PATCH  | `/api/access-requests/:id`  | Approve or reject a request                         | Admin                |

### Submissions & Grading

| Method | Path                               | Description                                                | Auth    |
| ------ | ---------------------------------- | ---------------------------------------------------------- | ------- |
| GET    | `/api/submissions`                 | List submissions (admins all, students see their own)      | Yes     |
| GET    | `/api/submissions/:id`             | Retrieve a submission with answers and grades              | Yes     |
| POST   | `/api/submissions`                 | Submit answers for a paper (enforces early-submission rule)| Student |
| POST   | `/api/submissions/:id/grades`      | Upsert grades per sub-question and mark submission reviewed| Admin   |

### User Management

| Method | Path                    | Description                    | Auth             |
| ------ | ----------------------- | ------------------------------ | ---------------- |
| GET    | `/api/users`            | List users (paginated)         | Admin            |
| GET    | `/api/users/:id`        | Get user details               | Admin/Self       |
| PATCH  | `/api/users/:id`        | Update profile (admin or self) | Admin/Self       |
| DELETE | `/api/users/:id`        | Delete a user                  | Admin            |

### Security and Uploads

| Method | Path | Description | Auth |
| --- | --- | --- | --- |
| POST | `/api/security/incidents` | Report an exam security incident | Yes |
| POST | `/api/security/exam-unlock` | Verify the exam unlock code | Yes |
| POST | `/api/security/exam-unlock/rotate` | Rotate the exam unlock code | Admin |
| POST | `/api/uploads/image` | Upload an image | Admin |
| POST | `/api/uploads/media` | Upload media | Admin |

### Utility Endpoints

| Method | Path        | Description                                        | Auth |
| ------ | ----------- | -------------------------------------------------- | ---- |
| GET    | `/health`   | Service health check (database status) | No   |
| GET    | `/api-docs` | Interactive Swagger UI documentation              | No   |
