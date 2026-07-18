# AI Life Coach & Habit Tracker

## Project Brief Details
This project is an AI-powered life coaching and habit tracking application. It features a full-stack Angular application with server-side rendering (SSR), leveraging the Gemini API for intelligent nudges, motivation profiles, and coaching responses. It uses Firebase Authentication for secure user sign-in, and PostgreSQL (via Drizzle ORM) for durable data storage. 

Key features include:
- **Dashboard:** View active nudges and daily summaries.
- **Habits & Routine:** Manage daily habits, time-blocked routines, and behavioral triggers.
- **Coach:** Chat with an AI life coach that tailors responses to your motivation profile.
- **Plan:** Review and adjust your personalized coaching plan.

## Project File Structure
```text
.
├── angular.json            # Angular CLI configuration
├── package.json            # Project dependencies and scripts
├── tsconfig.json           # TypeScript configuration
└── src/                    # Source code
    ├── app/                # Angular application code
    │   ├── auth/           # Authentication component and UI
    │   ├── coach/          # AI Coach chat interface
    │   ├── dashboard/      # Main dashboard view
    │   ├── habits/         # Habit and routine management
    │   ├── layout/         # Shell and navigation
    │   ├── onboarding/     # Initial user setup
    │   ├── plan/           # Coaching plan management
    │   └── shared/         # Shared services (API, Auth Guard)
    ├── db/                 # Database configuration and schemas
    │   ├── index.ts        # Drizzle ORM database connection
    │   ├── schema.ts       # PostgreSQL table definitions
    │   └── users.ts        # User management queries
    ├── lib/                # Library integrations
    │   └── firebase-admin.ts # Firebase Admin initialization
    ├── middleware/         # Express middleware
    │   └── auth.ts         # Authentication verification middleware
    ├── server/             # Server-side business logic
    │   └── gemini.service.ts # Gemini API integration
    ├── main.ts             # Client-side Angular bootstrap
    ├── main.server.ts      # Server-side Angular bootstrap
    └── server.ts           # Express server entry point
```

## Steps to Run Project Locally

### 1. Prerequisites
- Node.js (v18 or higher recommended)
- PostgreSQL database
- Firebase Project (for Authentication)
- Google Gemini API Key

### 2. Environment Variables
Create a `.env` file in the root directory and add the following variables:
```env
# PostgreSQL Database Configuration
SQL_HOST=your_db_host
SQL_USER=your_db_user
SQL_PASSWORD=your_db_password
SQL_DB_NAME=your_db_name
SQL_ADMIN_USER=your_db_admin_user
SQL_ADMIN_PASSWORD=your_db_admin_password

# Gemini API
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Firebase Configuration
Ensure your `firebase-applet-config.json` is present in the root directory for Firebase Admin initialization.

### 4. Install Dependencies
```bash
npm install
```

### 5. Start the Development Server
Run the following command to start the Angular development server along with the Express backend:
```bash
npm run start
```
The application will be available at `http://localhost:3000`.

## Steps to Deploy Project in GCP

### 1. Provision Cloud SQL (PostgreSQL)
1. Navigate to the Google Cloud Console.
2. Go to **SQL** and create a new PostgreSQL instance.
3. Create a database and user for the application.
4. Note down the connection details (Connection name, IP, User, Password).

### 2. Build the Application
Compile the Angular application and the Express server for production:
```bash
npm run build
```

### 3. Containerize the Application (Optional/Recommended for Cloud Run)
Create a `Dockerfile` to package the application.
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist/ ./dist/
EXPOSE 3000
CMD ["node", "dist/app/server/server.mjs"]
```

### 4. Deploy to Cloud Run
1. Use Google Cloud Build to build the container image and push it to Artifact Registry:
   ```bash
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/ai-coach-app
   ```
2. Deploy the image to Cloud Run:
   ```bash
   gcloud run deploy ai-coach-app \
     --image gcr.io/YOUR_PROJECT_ID/ai-coach-app \
     --platform managed \
     --region YOUR_REGION \
     --allow-unauthenticated \
     --set-env-vars="SQL_HOST=...,SQL_USER=...,SQL_PASSWORD=...,SQL_DB_NAME=...,GEMINI_API_KEY=..."
   ```

### 5. Firebase Authentication Settings
Ensure that your Cloud Run service URL is added to the authorized domains in your Firebase Authentication settings.
