# HomeCare — Apartment / PG Complaint Management

HomeCare is a full-stack complaint management system for apartment and PG residents. It provides a clear way to report maintenance issues, track their progress, and manage updates from a responsive dashboard.

## Features

- Submit complaints with resident, room/flat, contact, category, priority, description, and additional information
- View all submitted complaints in one dashboard
- Search by resident, room, contact, category, or issue description
- Filter complaints by category, priority, and status
- Open an individual complaint detail view
- Edit complaint information and update complaint status
- Mark complaints as resolved or cancel/delete them
- Receive success and error feedback for each action
- Responsive interface for desktop and mobile
- Persistent local data storage for submitted complaints

## Technology

- Frontend: React, TypeScript, and custom CSS
- Backend: Node.js, Express, and CORS
- Storage: local JSON file (`data/complaints.json`), created automatically at runtime

## Project structure

```text
.
├── my-app/          # React frontend
├── data/            # Local runtime complaint data
├── server.js         # Express API
├── dev.js            # Starts frontend and backend together
└── package.json      # Root project commands
```

## Getting started

Install dependencies for the backend and frontend:

```bash
npm install
npm --prefix my-app install
```

Start the full project:

```bash
npm start
```

The React app runs at [http://localhost:3000](http://localhost:3000), and the API runs at `http://localhost:3001`.

## Available commands

```bash
npm start        # Start the API and frontend together
npm run api      # Start only the Express API
npm test         # Run the frontend test suite
npm run build    # Create a production frontend build
```

## API endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/complaints` | Retrieve all complaints; supports search and filters |
| `GET` | `/api/complaints/:id` | Retrieve a specific complaint |
| `POST` | `/api/complaints` | Create a new complaint |
| `PUT` | `/api/complaints/:id` | Update complaint information |
| `PATCH` | `/api/complaints/:id/status` | Update a complaint status |
| `DELETE` | `/api/complaints/:id` | Delete a complaint |

## Data note

Runtime complaint data is deliberately excluded from Git. Each clone starts with an empty data folder and creates its own `data/complaints.json` file when a complaint is first saved.
