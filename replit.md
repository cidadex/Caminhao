# TruckFlow - Fleet Management System

## Overview

TruckFlow is a complete fleet management web application designed for trucking companies. It provides comprehensive tools for managing trucks, tracking mileage records, scheduling maintenance, and generating financial reports. The system is built with a modern full-stack architecture using React on the frontend and Express on the backend, with PostgreSQL for data persistence.

The application enables fleet managers to:
- Register and manage trucks with status tracking
- Record mileage with route information and revenue calculations
- Track maintenance activities with receipt uploads
- View dashboard analytics with revenue, costs, and truck performance rankings
- Generate filterable reports with PDF/Excel export capabilities

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state and caching
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for data visualization
- **Build Tool**: Vite with hot module replacement

The frontend follows a page-based structure with protected routes requiring authentication. The layout includes a collapsible sidebar navigation and supports light/dark themes.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **File Uploads**: Multer for handling receipt image uploads
- **PDF Generation**: PDFKit for report exports
- **API Design**: RESTful endpoints under `/api` prefix

The server handles both API routes and static file serving in production. Development mode uses Vite middleware for HMR.

### Database Design
- **Database**: PostgreSQL (hosted on Neon)
- **ORM**: Drizzle ORM with drizzle-kit for migrations
- **Schema Location**: `shared/schema.ts` contains all table definitions

Core entities:
- `users`: Authentication with role-based access (admin/user)
- `trucks`: Vehicle registry with status and total kilometers
- `mileageRecords`: Trip logs with revenue and route information
- `maintenances`: Service records with costs and optional receipt attachments
- `trackingSessions`: Real-time GPS tracking sessions per truck/driver, with `shareToken` for the public driver link and last-known position columns
- `locationPoints`: GPS history points (lat/lng/speed/heading/accuracy) attached to a tracking session

### GPS Tracking Module
- Admin page at `/rastreamento` shows a live OpenStreetMap (Leaflet) of all active trucks, polled every 5s, with session list (km/duração/vel-média per session via `?includeSummary=true`), filters by motorista/caminhão/datas, totals row, and session management.
- Public driver page at `/rastrear/:token` (no auth) is kept as a fallback for ad-hoc shares. The primary capture path is the **native mobile app** in `mobile/` (Expo).
- Drivers are managed at `/motoristas` and have an extra 🔑 button per card to set the username/password used by the mobile app (writes to `drivers.username` / `drivers.passwordHash`).
- Backend endpoints — admin: `GET/POST/DELETE /api/tracking/sessions` (with `includeSummary/driverId/truckId/startDate/endDate` filters), `GET /api/tracking/sessions/:id`, `GET /api/tracking/sessions/:id/summary`, `GET /api/tracking/sessions/:id/locations`, `POST /api/tracking/sessions/:id/end`, plus public token-based `GET /api/tracking/share/:token` and `POST /api/tracking/share/:token/location`, plus admin `POST /api/drivers/:id/credentials` and `/reset-password`.
- Backend endpoints — driver mobile API (JWT with `role: "driver"`): `POST /api/driver/login`, `GET /api/driver/me`, `POST /api/driver/trips/start` (resumes active session if any), `POST /api/driver/trips/:id/locations` (batch ≤200, returns `409 { code: "session_ended" }` if the session was closed), `POST /api/driver/trips/:id/end`, `GET /api/driver/trips`.
- Trip summary helper: `server/trip-summary.ts` (Haversine, drops accuracy>100m and implied speed>200km/h).
- Map library: `leaflet` + `react-leaflet` with OpenStreetMap tiles (no API key required).

### Native Driver App (`mobile/`)
- React Native + Expo (SDK 51) app for the driver phone, written in TypeScript.
- Background GPS capture using `expo-location` + `expo-task-manager` with Android `foregroundService` and iOS `UIBackgroundModes: ["location"]` — works with the screen locked and the phone in the pocket.
- Offline-first buffer in `expo-sqlite`: every GPS point is persisted locally, then flushed in batches every 5 s. Backend `409 session_ended` clears the buffer. Up to 6 drains are attempted before ending a trip.
- Auth token stored in `expo-secure-store`. JWT issued by `/api/driver/login` (30-day expiry, claim `role: "driver"`).
- Navigation: `@react-navigation/native-stack` with screens `Login → Home → Trip → Summary` plus `History`.
- Build pipeline configured for **EAS** (`mobile/eas.json`); see `mobile/README.md` for setup, permissions, and limitations of Expo Go vs. development builds.

### Design System
The application follows documented design guidelines (`design_guidelines.md`) based on enterprise design systems. Key principles include data-first hierarchy, professional clarity, and efficiency. The color system uses blue as primary (#0D6EFD) with neutral backgrounds.

### Project Structure
```
├── client/           # React frontend
│   └── src/
│       ├── components/  # UI components and shadcn/ui
│       ├── pages/       # Route pages
│       ├── hooks/       # Custom React hooks
│       └── lib/         # Utilities and auth context
├── server/           # Express backend
│   ├── routes.ts     # API endpoints
│   ├── storage.ts    # Database operations
│   └── db.ts         # Database connection
├── shared/           # Shared code
│   └── schema.ts     # Drizzle schema and Zod validators
└── migrations/       # Database migrations
```

## External Dependencies

### Database
- **PostgreSQL**: Primary database accessed via `DATABASE_URL` environment variable
- **Neon**: Serverless PostgreSQL hosting platform

### Authentication
- **JWT**: JSON Web Tokens for stateless authentication
- **bcryptjs**: Password hashing library

### File Storage
- Local filesystem storage in `uploads/` directory for maintenance receipts
- Supports JPEG, PNG, GIF, and PDF file types (5MB limit)

### Required Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (required)
- `SESSION_SECRET`: Secret key for JWT signing (optional, has default fallback)

### Key npm Packages
- `drizzle-orm` / `drizzle-kit`: Database ORM and migration tooling
- `@tanstack/react-query`: Server state management
- `@radix-ui/*`: Headless UI primitives for shadcn/ui components
- `recharts`: Charting library for dashboard visualizations
- `pdfkit`: PDF document generation
- `multer`: Multipart form data handling for file uploads
- `zod`: Schema validation used in both frontend forms and API validation