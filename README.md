# e-assessment

An e-assessment application for creating question papers, managing student access, taking exams, and reviewing submissions. Admins can create and grade assessments; students can request access, submit answers, and view feedback. Question types include descriptive, multiple choice, graph, table, circuit, drawing, and image composition.

**Live app:** [online-exam.flowstacker.xyz](https://online-exam.flowstacker.xyz/)

## Features

- **Administration:** Create and schedule papers, manage access requests, and grade submissions.
- **Student dashboard:** Take assessments, submit answers, and view feedback.
- **Question formats:** Use rich text, graphs, circuits, drawings, tables, and more.
- **Security:** Cookie-based authentication, role-based access, and exam security settings.
- **Integrations:** Cloudinary media uploads and Swagger API documentation.

## How it works

1. An admin creates and publishes a paper with its questions and exam schedule.
2. A student requests access; an admin reviews the request.
3. An approved student takes the assessment and submits answers.
4. An admin grades the submission, and the student can view feedback.

## Project structure

- [`client/`](client/README.md) — Next.js frontend
- [`api/`](api/README.md) — Express API, PostgreSQL database access, and Prisma migrations

## Getting started

**Prerequisites:** Node.js 22.21.1 or newer and a PostgreSQL database. Configure and start the API and client in separate terminals using their respective guides.

| Service | Local URL |
| --- | --- |
| Client | http://localhost:3000 |
| API | http://localhost:8080 |
| API documentation | http://localhost:8080/api-docs |
| Health check | http://localhost:8080/health |

See the [API guide](api/README.md) for database setup and the migration-history caveat, and the [client guide](client/README.md) for frontend setup.

## Stack

Next.js, React, TypeScript, Express, PostgreSQL, Prisma, and Cloudinary for media uploads.
