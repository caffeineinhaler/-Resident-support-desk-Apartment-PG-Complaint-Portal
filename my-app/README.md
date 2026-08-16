# HomeCare — Apartment / PG Complaint Portal

HomeCare is a responsive resident-support dashboard for logging and tracking apartment or PG maintenance issues. Residents can submit requests, see the current status, and mark requests as resolved when the work is complete.

## Features

- Clean, responsive dashboard designed for desktop and mobile
- Complaint form with category and priority selection
- Contact and additional-information fields
- Search and filter controls for the request list
- Complaint detail view with edit, status, and delete actions
- Request tracker with pending, in-progress, resolved, and cancelled indicators
- Clear inline success and error messages
- Lightweight Express API with CORS support

## Tech stack

- React + TypeScript
- CSS (custom responsive design; no UI framework)
- Express + Node.js

## Run locally

Install dependencies for both the API and frontend:

```bash
npm install
npm --prefix my-app install
```

Start the full project with one command:

```bash
npm start
```

This starts the Express API and React development server together. Open [http://localhost:3000](http://localhost:3000).

If you prefer to start them separately:

```bash
npm run api
npm --prefix my-app start
```

The frontend proxies API requests to `http://localhost:3001` during development.

## Available commands

From the repository root:

```bash
npm start        # Start the API and frontend together
npm run api    # Start the Express API on port 3001
npm run build  # Create a production frontend build
npm test       # Run frontend tests once
```

## API endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/complaints` | List all complaints |
| `GET` | `/api/complaints/:id` | Retrieve one complaint |
| `POST` | `/api/complaints` | Create a complaint |
| `PUT` | `/api/complaints/:id` | Update complaint information |
| `PATCH` | `/api/complaints/:id/status` | Update complaint status |
| `DELETE` | `/api/complaints/:id` | Delete a complaint |

> Complaints are saved locally in `data/complaints.json`, so they remain available after the API server restarts.
