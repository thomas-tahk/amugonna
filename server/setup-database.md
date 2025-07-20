# Database Setup Instructions

## Step 1: Install PostgreSQL

### Using Homebrew (Recommended):
```bash
brew install postgresql@15
```

### Alternative - Direct Download:
Visit https://www.postgresql.org/download/macos/ and download the installer.

## Step 2: Start PostgreSQL Service
```bash
brew services start postgresql@15
```

## Step 3: Create Database and User
```bash
# Connect to PostgreSQL as superuser
psql postgres

# Create database
CREATE DATABASE amugonna_dev;

# Create user (optional - can use default postgres user)
CREATE USER amugonna_user WITH PASSWORD 'your_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE amugonna_dev TO amugonna_user;

# Exit psql
\q
```

## Step 4: Test Connection
```bash
psql -h localhost -p 5432 -U postgres -d amugonna_dev
```

**Expected Result:** You should connect successfully and see:
```
amugonna_dev=#
```

## Step 5: Generate Prisma Client
```bash
cd server
npx prisma generate
```

**Expected Result:** "Generated Prisma Client" message

## Step 6: Apply Database Schema
```bash
npx prisma db push
```

**Expected Result:** All tables created successfully

## Step 7: Start Server
```bash
npm run dev
```

**Expected Result:** "Server running on port 3001"

## Step 8: Test Health Endpoint
Visit: http://localhost:3001/health

**Expected Result:**
```json
{
  "status": "OK",
  "message": "Amugonna server is running",
  "database": "Connected"
}
```

## Troubleshooting

### If PostgreSQL won't start:
```bash
brew services restart postgresql@15
```

### If database connection fails:
- Check if PostgreSQL is running: `brew services list | grep postgresql`
- Verify database exists: `psql postgres -c "\l"`
- Check connection string in `.env` file

### If port 5432 is busy:
```bash
lsof -i :5432
```
Kill conflicting processes or use different port.