# Amugonna

A recipe recommendation app that helps users find recipes based on their fridge and pantry contents.

## Features

- **AI Recipe Generation**: Generate custom recipes using OpenAI based on your available ingredients
- **Smart Ingredient Management**: Search and add ingredients to your personal pantry
- **User Authentication**: Secure user accounts with JWT-based authentication
- **Dietary Restrictions Support**: Filter recipes based on dietary preferences and restrictions
- **Nutritional Information**: Get detailed nutrition facts for generated recipes
- **Recipe Management**: Save, view, and manage your generated recipes
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **AI**: OpenAI GPT-3.5-turbo for recipe generation
- **Authentication**: JWT tokens with bcryptjs
- **Hosting**: Digital Ocean (ready for deployment)

## Development

This is a monorepo structure:
- `/client` - React frontend
- `/server` - Node.js backend

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL
- OpenAI API Key (for recipe generation)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/amugonna.git
   cd amugonna
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy the example environment file
   cp server/.env.example server/.env
   
   # Edit server/.env and add your:
   # - Database connection string
   # - JWT secret
   # - OpenAI API key
   ```

4. **Set up the database**
   ```bash
   cd server
   npx prisma db push
   npm run seed
   ```

5. **Start the development servers**
   ```bash
   # From the root directory
   npm run dev
   ```

This will start:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

### Usage

1. **Create an account** or log in
2. **Add ingredients** to your pantry using the search function
3. **Generate recipes** by selecting your available ingredients
4. **Customize** recipes with cuisine preferences and dietary restrictions
5. **Save and manage** your favorite recipes

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile

### Ingredients
- `GET /api/ingredients` - Search ingredients
- `GET /api/ingredients/user` - Get user's pantry
- `POST /api/ingredients/user` - Add ingredient to pantry

### Recipes
- `POST /api/recipes/generate` - Generate AI recipe
- `GET /api/recipes` - Get user's recipes
- `GET /api/recipes/:id` - Get specific recipe