# System Architecture

## Overview
Amugonna follows a traditional client-server architecture with a React frontend, Node.js backend, and PostgreSQL database.

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │    │  Express API    │    │   PostgreSQL    │
│   (Port 5173)   │◄──►│  (Port 3001)    │◄──►│   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  External APIs  │
                       │  (Spoonacular)  │
                       └─────────────────┘
```

## Database Schema (Initial Design)

### Core Tables

```sql
-- Users and Authentication
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Master ingredient list
CREATE TABLE ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(100),
    common_units TEXT[], -- ['cups', 'tablespoons', 'grams']
    nutritional_info JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User's available ingredients
CREATE TABLE user_ingredients (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    ingredient_id INTEGER REFERENCES ingredients(id),
    quantity DECIMAL(10,2),
    unit VARCHAR(50),
    expiration_date DATE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, ingredient_id)
);

-- Recipe data (cached from API + user-generated)
CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255), -- API recipe ID
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT NOT NULL,
    prep_time INTEGER, -- minutes
    cook_time INTEGER, -- minutes
    servings INTEGER,
    image_url VARCHAR(500),
    source_url VARCHAR(500),
    created_by INTEGER REFERENCES users(id), -- NULL for API recipes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recipe ingredients (normalized)
CREATE TABLE recipe_ingredients (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id),
    ingredient_id INTEGER REFERENCES ingredients(id),
    quantity DECIMAL(10,2),
    unit VARCHAR(50),
    optional BOOLEAN DEFAULT FALSE,
    substitutions TEXT[], -- Alternative ingredients
    preparation_note VARCHAR(255) -- "diced", "chopped", etc.
);
```

### Dietary Restrictions Schema

```sql
-- Dietary restriction types
CREATE TABLE dietary_restrictions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL, -- 'vegetarian', 'vegan', 'gluten-free'
    description TEXT,
    category VARCHAR(50) -- 'diet', 'allergy', 'intolerance'
);

-- User's dietary restrictions
CREATE TABLE user_dietary_restrictions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    restriction_id INTEGER REFERENCES dietary_restrictions(id),
    severity VARCHAR(50), -- 'strict', 'moderate', 'mild'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, restriction_id)
);

-- Recipe dietary compatibility
CREATE TABLE recipe_dietary_tags (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id),
    restriction_id INTEGER REFERENCES dietary_restrictions(id),
    is_compatible BOOLEAN NOT NULL,
    verified_at TIMESTAMP,
    UNIQUE(recipe_id, restriction_id)
);
```

## API Design Structure

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Ingredient Management
- `GET /api/ingredients` - Search ingredients
- `GET /api/user/ingredients` - Get user's ingredients
- `POST /api/user/ingredients` - Add ingredient to user's pantry
- `DELETE /api/user/ingredients/:id` - Remove ingredient

### Recipe Discovery
- `GET /api/recipes/match` - Find recipes based on user's ingredients
- `GET /api/recipes/:id` - Get recipe details
- `POST /api/recipes/favorite` - Save recipe to favorites
- `GET /api/user/favorites` - Get user's favorite recipes

### Dietary Restrictions
- `GET /api/dietary-restrictions` - Get all dietary restrictions
- `POST /api/user/dietary-restrictions` - Add dietary restriction
- `DELETE /api/user/dietary-restrictions/:id` - Remove dietary restriction

## Frontend Architecture

### Component Structure
```
src/
├── components/
│   ├── common/          # Reusable UI components
│   ├── auth/           # Authentication components
│   ├── ingredients/    # Ingredient management
│   ├── recipes/        # Recipe display and search
│   └── dietary/        # Dietary restriction components
├── pages/              # Page-level components
├── hooks/              # Custom React hooks
├── services/           # API service functions
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

### State Management
- **Initial**: React Context for global state
- **Later**: Consider Redux Toolkit for complex state management

## Security Considerations

### Authentication
- JWT tokens for session management
- Password hashing with bcrypt
- Rate limiting on auth endpoints

### Data Protection
- Input validation and sanitization
- SQL injection prevention with parameterized queries
- CORS configuration for frontend-backend communication

### Dietary Safety
- Strict validation of dietary restrictions
- Fail-safe approach: exclude recipes when in doubt
- User confirmation for allergy-related filtering