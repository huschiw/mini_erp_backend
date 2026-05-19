# Smart Inventory ERP — Backend (Phase 1)

API server for Auth, Products, and Categories.

## Stack

- Next.js API Routes
- Prisma ORM + PostgreSQL
- JWT authentication (jose + bcryptjs)
- Zod validation

## Setup

```bash
# Install dependencies
npm install

# Configure database (default in .env)
# DATABASE_URL="postgresql://huschiw@localhost:5432/miniERP"

# Create database if needed
createdb miniERP

# Push schema & seed demo data
npm run db:push
npm run db:seed

# Start API server (port 3001)
npm run dev
```

## Demo accounts

| Email | Password | Role |
|-------|----------|------|
| admin@erp.com | admin123 | ADMIN |
| staff@erp.com | staff123 | STAFF |

## API Endpoints

| Method | Path | Auth | Role |
|--------|------|------|------|
| POST | `/api/auth/login` | — | — |
| POST | `/api/auth/logout` | ✓ | any |
| GET | `/api/auth/me` | ✓ | any |
| GET | `/api/categories` | ✓ | any |
| POST | `/api/categories` | ✓ | ADMIN |
| PATCH | `/api/categories/:id` | ✓ | ADMIN |
| DELETE | `/api/categories/:id` | ✓ | ADMIN |
| GET | `/api/products` | ✓ | any |
| POST | `/api/products` | ✓ | ADMIN |
| PATCH | `/api/products/:id` | ✓ | ADMIN |
| DELETE | `/api/products/:id` | ✓ | ADMIN |

Send `Authorization: Bearer <token>` for protected routes.
