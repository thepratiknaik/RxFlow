# RxFlow Backend Server

Node.js/Express server for RxFlow pharmacy management system.

## Setup

1. **Install dependencies:**

```bash
npm install
```

2. **Configure environment:**
   Create a `.env` file in the server directory:

```
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rxflow
DB_USER=postgres
DB_PASSWORD=password
JWT_SECRET=your_jwt_secret_key_change_this_in_production_please_use_strong_random_string
JWT_EXPIRE=7d
NODE_ENV=development
REDIS_URL=redis://127.0.0.1:6379
CLIENT_APP_BASE_URL=http://localhost:3000
PRESCRIPTION_REVIEW_FALLBACK_EMAIL=aditya.srivastava@pace.edu
PRESCRIPTION_REVIEW_TOKEN_TTL_HOURS=72
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=no-reply@rxlfow.example.com
```

3. **Test database connection (optional):**

```bash
npm run test:db
```

4. **Validate/bootstrap schema against the DDL (optional):**

```bash
npm run db:bootstrap
# or
npm run db:schema
```

This command uses the database from your current `.env` file:
- If `DB_ROOT_USER` and `DB_ROOT_PASSWORD` are set, it first connects as the PostgreSQL admin/root user, creates `DB_NAME` if missing, creates/updates `DB_USER` if missing, and grants the app role access.
- If all DDL tables already exist, it skips the bootstrap.
- If the connected database is fresh or contains none of the DDL tables, it runs `server/models/schema/schema_ddl.sql`.
- If the connected database partially matches the DDL, it stops with an error so you can point the app at a new database instead of mixing legacy and strict-DDL tables.

To replace the current database with a clean one while preserving a backup, run:

```bash
npm run db:reset
```

This command:
- renames the current `DB_NAME` database to a timestamped `_legacy_...` backup when it already exists
- creates a fresh database with the original `DB_NAME`
- ensures the configured app role exists and can connect
- runs the DDL bootstrap on the new database

5. **Start development server:**

```bash
npm run dev
```

## Run Locally Without Docker

Use this flow when running client, server, and Redis directly in terminals.

1. Start Redis locally (outside Docker):

- If Redis is already installed on your machine:

```bash
redis-server
```

- Optional health check in another terminal:

```bash
redis-cli ping
```

Expected response is `PONG`.

2. Start backend API:

```bash
cd server
npm install
npm run dev
```

3. Start frontend client in a separate terminal:

```bash
cd client
npm install
npm start
```

4. Open the app:

- Client: http://localhost:3000
- API: http://localhost:5000/api/health

### Windows Note

If `redis-server` is not recognized in PowerShell, install Redis for local development using your preferred method (native Redis distribution, WSL, or Memurai), then run Redis again and verify with `redis-cli ping`.

Or production:

```bash
npm start
```

## Database Setup

PostgreSQL is required. Update the database credentials in `.env`:

- **DB_HOST** - PostgreSQL host (local or AWS RDS endpoint)
- **DB_PORT** - PostgreSQL port (default 5432)
- **DB_NAME** - Database name (create manually)
- **DB_USER** - PostgreSQL username
- **DB_PASSWORD** - PostgreSQL password

### AWS RDS Setup

For AWS RDS PostgreSQL:

1. The connection automatically detects AWS RDS hosts and enables SSL
2. (Optional) Download the AWS RDS CA certificate bundle:
   - Create a `certs` folder in the server directory
   - Download from: https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
   - Save as `server/certs/global-bundle.pem`
3. Update `.env` with your RDS endpoint:
   ```
   DB_HOST=your-instance.region.rds.amazonaws.com
   ```

The server will automatically sync models with the database on startup.

## Prescription Review Email

The "Send for review" flow only sends a real email when SMTP is configured.

- If `SMTP_HOST` is missing, the backend does not send mail. It logs a `[Prescription email stub]` entry in the server console instead.
- The recipient is the matched prescriber's email when available.
- If no prescriber email is available, the backend falls back to `PRESCRIPTION_REVIEW_FALLBACK_EMAIL`.
- `CLIENT_APP_BASE_URL` controls the review link host used in the email body.

## API Endpoints

### Authentication Routes (`/api/auth`)

#### 1. Register User

- **POST** `/api/auth/register`
- **Description:** Create a new user account
- **Body:**

```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "confirmPassword": "password123"
}
```

- **Response:**

```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user_id",
    "fullName": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

#### 2. Login User

- **POST** `/api/auth/login`
- **Description:** Authenticate user and get JWT token
- **Body:**

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

- **Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user_id",
    "fullName": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

#### 3. Get Current User

- **GET** `/api/auth/me`
- **Description:** Get logged-in user details
- **Headers:** `Authorization: Bearer <token>`
- **Response:**

```json
{
  "success": true,
  "user": {
    "_id": "user_id",
    "fullName": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "isActive": true,
    "lastLogin": "2024-02-25T10:00:00Z",
    "createdAt": "2024-02-20T10:00:00Z",
    "updatedAt": "2024-02-25T10:00:00Z"
  }
}
```

#### 4. Logout User

- **GET** `/api/auth/logout`
- **Description:** Logout user (token deleted client-side)
- **Headers:** `Authorization: Bearer <token>`
- **Response:**

```json
{
  "success": true,
  "message": "Logout successful"
}
```

### Health Check

#### Server Health

- **GET** `/api/health`
- **Description:** Check if server is running
- **Response:**

```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-02-25T10:00:00Z"
}
```

## Authentication

Protected endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

## User Roles

- **user** - Regular user (default)
- **pharmacist** - Pharmacy professional
- **admin** - System administrator

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

Common status codes:

- `200` - Success
- `201` - Created
- `400` - Bad request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not found
- `409` - Conflict (e.g., email already exists)
- `500` - Server error

## Development

Watch mode with automatic restart:

```bash
npm run dev
```

## Project Structure

```
server/
├── .dockerignore
├── .env
├── .gitignore
├── Dockerfile
├── index.js
├── package-lock.json
├── package.json
├── README.md
├── test-db.js
├── assets/
│   ├── favicon.ico
│   └── logo.png
├── config/
│   └── db.js
├── controllers/
│   ├── authController.js
│   ├── drugController.js
│   ├── inventoryController.js
│   ├── patientController.js
│   ├── prescriptionController.js
│   └── profileController.js
├── docs/
│   ├── apiDocs.js
│   └── endpointMetadata.js
├── middleware/
│   └── auth.js
├── models/
│   ├── Drug.js
│   ├── DrugPullAudit.js
│   ├── InventoryLot.js
│   ├── Patient.js
│   ├── PatientAudit.js
│   ├── Prescription.js
│   └── User.js
├── public/
│   ├── app.js
│   ├── favicon.ico
│   ├── index.html
│   └── styles.css
├── queues/
│   └── drugPullQueue.js
├── routes/
│   ├── auth.js
│   ├── drugs.js
│   ├── inventory.js
│   ├── patients.js
│   ├── prescriptions.js
│   └── profile.js
├── services/
│   ├── drugPullService.js
│   ├── fhirPrescriptionService.js
│   └── inventoryService.js
└── workers/
  └── drugPullWorker.js
```

## Next Steps

- Add more routes for pharmacy operations
- Implement refresh token mechanism
- Add input validation/sanitization
- Add email verification
- Add password reset functionality
- Add user profile management
- Add logging system
