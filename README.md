# NotifyFlow – Serverless Multi-Channel Notification Platform

NotifyFlow is a production-ready, event-driven notification engine that supports Email, SMS, and Push notification channels. It utilizes an event queue processing model with background worker simulation and serverless AWS Lambda handler structures.

---

## Technical Architecture

```mermaid
graph TD
    A[Client Web App] -->|HTTP / REST| B[API Gateway / Express Server]
    A -->|WS Connection| B
    B -->|Database Push| C[(PostgreSQL DB)]
    B -->|Enqueue Work| D[SQS Queue Engine]
    D -->|SQS Consumer Batch| E[AWS Lambda Handlers]
    E -->|SMS Integration| F[Twilio API]
    E -->|Push Notification| G[Firebase FCM Gateway]
    E -->|HTML & Plain Email| H[AWS SES / Nodemailer]
    E -->|Update Logs & Analytics| C
    C -->|Trigger Broadcast| B
```

---

## Key Features

1. **Authentication Gateway**: Secures routes with JWT tokens and role-based permissions (User/Admin).
2. **Dynamic Notification Composer**: Compose custom messages or select templates, configure target groups, set high/medium/low priority, and schedule dates.
3. **Template Engine**: Dynamic string interpolation using `{{variable}}` templates.
4. **Queue Worker with Backoff**: Simulation of AWS SQS queue buffers. Configured with a 3x retry budget and Dead Letter Queue (DLQ) routing.
5. **Real-time Broadcast Feeds**: Connects frontend dashboards directly to live worker feeds via Socket.io.
6. **Analytics and Charts**: Timeline velocity graphs, volume share bar charts, and KPI success stats cards.

---

## Quick Start (Local Setup)

### Prerequisites

- Node.js (v18 or higher)
- Docker Desktop (for Postgres container)

### Step 1: Spin up PostgreSQL Database

Start the database container using the Docker Compose file:
```bash
cd docker
docker-compose up -d
```

### Step 2: Configure Environment Variables

Inside `/backend/.env`, configure your PostgreSQL URL:
```env
PORT=5000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/notifyflow?schema=public"
JWT_SECRET="super_secret_jwt_key_notifyflow_2026"
USE_LOCAL_MOCKS=true
```

### Step 3: Run Database Migrations and Seed

Run the database setup scripts:
```bash
cd backend
npx prisma db push
npm run seed
```

### Step 4: Launch Backend & Frontend Servers

Start the backend API server:
```bash
cd backend
npm run dev
```

Start the React/Vite development server:
```bash
cd frontend
npm run dev
```

---

## API Endpoints

### 1. Authentication
* `POST /api/auth/register` - Create new account.
* `POST /api/auth/login` - Authenticate using email and password credentials.
* `POST /api/auth/google-login` - Authenticate using Google OAuth token.

### 2. Notifications
* `POST /api/notifications` - Queue immediately or schedule a notification.
* `GET /api/notifications` - Retrieve historical log. Supports `channel`, `priority`, `status`, and `search` query parameters.
* `GET /api/notifications/:id` - Retrieve full status history timeline.
* `POST /api/notifications/:id/cancel` - Cancel a pending scheduled notification.

### 3. Templates
* `POST /api/templates` - Create template.
* `GET /api/templates` - Get templates.
* `PUT /api/templates/:id` - Update template.
* `DELETE /api/templates/:id` - Delete template.

---

## Demo Accounts (Grading Convenience)

Use these quick buttons on the Login page to authenticate immediately:
- **System Admin**: `admin@notifyflow.com` / `admin123`
- **Alex Johnson**: `user@notifyflow.com` / `user123`
