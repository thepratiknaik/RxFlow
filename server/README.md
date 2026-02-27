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
```

3. **Test database connection (optional):**

```bash
npm run test:db
```

4. **Start development server:**

```bash
npm run dev
```

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

- **POST** `/api/auth/logout`
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
├── config/
│   └── db.js           # Database connection
├── controllers/
│   └── authController.js # Auth logic
├── middleware/
│   └── auth.js         # JWT verification
├── models/
│   └── User.js         # User schema
├── routes/
│   └── auth.js         # Auth routes
├── index.js            # Main server file
├── .env                # Environment variables
├── .gitignore          # Git ignore file
└── package.json        # Dependencies
```

## Next Steps

- Add more routes for pharmacy operations
- Implement refresh token mechanism
- Add input validation/sanitization
- Add email verification
- Add password reset functionality
- Add user profile management
- Add logging system
