import type {
  ApiResponse,
  AuthResponse,
  LoginCredentials,
  RegisterData,
  User,
  IngredientsResponse,
  UserIngredientsResponse,
  CategoriesResponse,
  AddIngredientData,
  UpdateIngredientData,
} from '../types';

const API_BASE_URL = 'http://localhost:3001/api';

// Helper function to get auth headers
const getAuthHeaders = (token?: string) => {
  const authToken = token || localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(authToken && { Authorization: `Bearer ${authToken}` }),
  };
};

// Helper function for API requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    return {
      success: false,
      message: 'Network error occurred',
    };
  }
}

// Auth API functions
export const authApi = {
  register: async (userData: RegisterData): Promise<AuthResponse> => {
    const response = await apiRequest<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    return {
      success: response.success,
      message: response.message || '',
      data: response.data!,
    };
  },

  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiRequest<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    return {
      success: response.success,
      message: response.message || '',
      data: response.data!,
    };
  },

  getProfile: async (token?: string): Promise<ApiResponse<{ user: User }>> => {
    return apiRequest('/auth/profile', {
      method: 'GET',
      headers: getAuthHeaders(token),
    });
  },

  updateProfile: async (
    userData: Partial<Pick<User, 'firstName' | 'lastName'>>,
    token?: string
  ): Promise<ApiResponse<{ user: User }>> => {
    return apiRequest('/auth/profile', {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify(userData),
    });
  },
};

// Ingredients API functions
export const ingredientsApi = {
  search: async (searchParams: {
    search?: string;
    category?: string;
    limit?: number;
  }): Promise<ApiResponse<IngredientsResponse>> => {
    const queryParams = new URLSearchParams();
    if (searchParams.search) queryParams.set('search', searchParams.search);
    if (searchParams.category) queryParams.set('category', searchParams.category);
    if (searchParams.limit) queryParams.set('limit', searchParams.limit.toString());

    const queryString = queryParams.toString();
    return apiRequest(`/ingredients${queryString ? `?${queryString}` : ''}`);
  },

  getCategories: async (): Promise<ApiResponse<CategoriesResponse>> => {
    return apiRequest('/ingredients/categories');
  },

  getUserIngredients: async (token?: string): Promise<ApiResponse<UserIngredientsResponse>> => {
    return apiRequest('/ingredients/user', {
      method: 'GET',
      headers: getAuthHeaders(token),
    });
  },

  addUserIngredient: async (
    ingredientData: AddIngredientData,
    token?: string
  ): Promise<ApiResponse<{ userIngredient: any }>> => {
    return apiRequest('/ingredients/user', {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(ingredientData),
    });
  },

  updateUserIngredient: async (
    id: number,
    ingredientData: UpdateIngredientData,
    token?: string
  ): Promise<ApiResponse<{ userIngredient: any }>> => {
    return apiRequest(`/ingredients/user/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify(ingredientData),
    });
  },

  removeUserIngredient: async (
    id: number,
    token?: string
  ): Promise<ApiResponse<void>> => {
    return apiRequest(`/ingredients/user/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(token),
    });
  },
};