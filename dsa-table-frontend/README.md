# DSA Table Frontend

Angular frontend application for the DSA Table pen-and-paper game platform.

## Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- Angular CLI (v19 or higher)

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:4200`

## Backend Connection

Make sure the backend is running on `http://localhost:8080`. The API URL is configured in:
- `src/environments/environment.ts` (development)
- `src/environments/environment.prod.ts` (production)

## Project Structure

```
src/
├── app/
│   ├── components/          # Angular components
│   │   └── character-list/  # Character list component
│   ├── models/              # TypeScript interfaces/models
│   │   ├── character.model.ts
│   │   ├── user.model.ts
│   │   └── game-session.model.ts
│   ├── services/            # API services
│   │   ├── character.service.ts
│   │   ├── user.service.ts
│   │   └── game-session.service.ts
│   ├── app.component.*      # Root component
│   ├── app.config.ts        # App configuration
│   └── app.routes.ts        # Routing configuration
└── environments/             # Environment configurations
```

## Features

- **Character Management**: View and manage DSA characters
- **REST API Integration**: Services for Characters, Users, and Game Sessions
- **Responsive Design**: Modern, clean UI with SCSS styling

## Development

### Build

```bash
npm run build
```

### Run Tests

```bash
npm test
```

## API Endpoints

The frontend connects to the following backend endpoints:

- `GET /api/characters` - Get all characters
- `GET /api/characters/:id` - Get character by ID
- `POST /api/characters` - Create character
- `PUT /api/characters/:id` - Update character
- `DELETE /api/characters/:id` - Delete character
- `GET /api/users` - Get all users
- `GET /api/sessions` - Get all game sessions

For complete API documentation, visit `http://localhost:8080/swagger-ui.html` when the backend is running.
