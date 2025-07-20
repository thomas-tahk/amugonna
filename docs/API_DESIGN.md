# API Design & Endpoints

## Base URL
- Development: `http://localhost:3001/api`
- Production: `https://api.amugonna.com/api`

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Response Format
All responses follow this structure:
```json
{
  "success": true,
  "data": {...},
  "message": "Optional message",
  "errors": [] // Only present on validation errors
}
```

## Endpoints

### Authentication
#### `POST /auth/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "token": "jwt_token_here"
  }
}
```

#### `POST /auth/login`
Login user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### `GET /auth/profile`
Get current user profile (protected).

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "dietaryRestrictions": [...],
      "createdAt": "2023-01-01T00:00:00Z"
    }
  }
}
```

### Ingredients
#### `GET /ingredients?search=<query>`
Search for ingredients in the master list.

**Query Parameters:**
- `search`: Search term for ingredient name
- `category`: Filter by ingredient category
- `limit`: Number of results to return (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "ingredients": [
      {
        "id": 1,
        "name": "Chicken Breast",
        "category": "Protein",
        "commonUnits": ["pounds", "pieces", "grams"],
        "nutritionalInfo": {...}
      }
    ]
  }
}
```

#### `GET /user/ingredients`
Get user's current ingredient inventory (protected).

**Response:**
```json
{
  "success": true,
  "data": {
    "ingredients": [
      {
        "id": 1,
        "ingredient": {
          "id": 1,
          "name": "Chicken Breast",
          "category": "Protein"
        },
        "quantity": 2,
        "unit": "pounds",
        "expirationDate": "2023-12-31",
        "addedAt": "2023-01-01T00:00:00Z"
      }
    ]
  }
}
```

#### `POST /user/ingredients`
Add ingredient to user's inventory (protected).

**Request Body:**
```json
{
  "ingredientId": 1,
  "quantity": 2,
  "unit": "pounds",
  "expirationDate": "2023-12-31"
}
```

### Recipes
#### `GET /recipes/match`
Find recipes based on user's available ingredients (protected).

**Query Parameters:**
- `includePartial`: Include recipes with some missing ingredients (default: false)
- `minMatchPercentage`: Minimum percentage of ingredients user has (default: 80)
- `maxMissingIngredients`: Maximum number of missing ingredients (default: 2)
- `dietaryRestrictions`: Filter by dietary restrictions (default: user's restrictions)

**Response:**
```json
{
  "success": true,
  "data": {
    "recipes": [
      {
        "id": 1,
        "title": "Grilled Chicken Breast",
        "description": "Simple grilled chicken with herbs",
        "imageUrl": "https://example.com/image.jpg",
        "prepTime": 15,
        "cookTime": 25,
        "servings": 4,
        "matchScore": 95,
        "availableIngredients": 8,
        "totalIngredients": 9,
        "missingIngredients": [
          {
            "id": 2,
            "name": "Olive Oil",
            "quantity": 2,
            "unit": "tablespoons"
          }
        ],
        "dietaryCompatibility": {
          "vegetarian": false,
          "vegan": false,
          "glutenFree": true,
          "dairyFree": true
        }
      }
    ],
    "totalResults": 25,
    "page": 1,
    "limit": 10
  }
}
```

#### `GET /recipes/:id`
Get detailed recipe information.

**Response:**
```json
{
  "success": true,
  "data": {
    "recipe": {
      "id": 1,
      "title": "Grilled Chicken Breast",
      "description": "Simple grilled chicken with herbs",
      "instructions": "1. Preheat grill...",
      "prepTime": 15,
      "cookTime": 25,
      "servings": 4,
      "imageUrl": "https://example.com/image.jpg",
      "sourceUrl": "https://example.com/recipe",
      "ingredients": [
        {
          "id": 1,
          "name": "Chicken Breast",
          "quantity": 2,
          "unit": "pounds",
          "optional": false,
          "substitutions": ["Chicken Thighs"],
          "preparationNote": "boneless, skinless"
        }
      ],
      "nutritionalInfo": {...},
      "dietaryTags": [...]
    }
  }
}
```

### Dietary Restrictions
#### `GET /dietary-restrictions`
Get all available dietary restrictions.

**Response:**
```json
{
  "success": true,
  "data": {
    "restrictions": [
      {
        "id": 1,
        "name": "Vegetarian",
        "description": "No meat, poultry, or fish",
        "category": "diet"
      },
      {
        "id": 2,
        "name": "Gluten-Free",
        "description": "No wheat, barley, rye, or gluten-containing ingredients",
        "category": "intolerance"
      }
    ]
  }
}
```

#### `POST /user/dietary-restrictions`
Add dietary restriction to user profile (protected).

**Request Body:**
```json
{
  "restrictionId": 1,
  "severity": "strict",
  "notes": "Severe allergy - very important"
}
```

#### `DELETE /user/dietary-restrictions/:id`
Remove dietary restriction from user profile (protected).

### Favorites
#### `POST /user/favorites`
Add recipe to user's favorites (protected).

**Request Body:**
```json
{
  "recipeId": 1
}
```

#### `GET /user/favorites`
Get user's favorite recipes (protected).

**Response:**
```json
{
  "success": true,
  "data": {
    "favorites": [
      {
        "id": 1,
        "recipe": {
          "id": 1,
          "title": "Grilled Chicken Breast",
          "imageUrl": "https://example.com/image.jpg",
          "prepTime": 15,
          "cookTime": 25
        },
        "addedAt": "2023-01-01T00:00:00Z"
      }
    ]
  }
}
```

## Error Responses
All error responses follow this format:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

## HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error