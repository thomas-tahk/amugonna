import React, { useState, useEffect } from 'react';
import { UserIngredient, Ingredient, AddIngredientData } from '../types';
import { ingredientsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import IngredientSearch from './IngredientSearch';
import './PantryManager.css';

const PantryManager: React.FC = () => {
  const { isAuthenticated, token } = useAuth();
  const [userIngredients, setUserIngredients] = useState<UserIngredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingIngredient, setIsAddingIngredient] = useState(false);

  // Add ingredient form state
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [quantity, setQuantity] = useState<string>('');
  const [unit, setUnit] = useState<string>('');
  const [expirationDate, setExpirationDate] = useState<string>('');

  useEffect(() => {
    if (isAuthenticated) {
      loadUserIngredients();
    }
  }, [isAuthenticated]);

  const loadUserIngredients = async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      const response = await ingredientsApi.getUserIngredients(token);
      
      if (response.success && response.data) {
        setUserIngredients(response.data.ingredients);
      } else {
        setError(response.message || 'Failed to load ingredients');
      }
    } catch (error) {
      console.error('Error loading user ingredients:', error);
      setError('Failed to load ingredients');
    } finally {
      setIsLoading(false);
    }
  };

  const handleIngredientSelect = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setIsAddingIngredient(true);
    // Set default unit if available
    if (ingredient.commonUnits.length > 0) {
      setUnit(ingredient.commonUnits[0]);
    }
  };

  const handleAddIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedIngredient || !token) return;

    try {
      const ingredientData: AddIngredientData = {
        ingredientId: selectedIngredient.id,
        ...(quantity && { quantity: parseFloat(quantity) }),
        ...(unit && { unit }),
        ...(expirationDate && { expirationDate }),
      };

      const response = await ingredientsApi.addUserIngredient(ingredientData, token);
      
      if (response.success) {
        // Reload ingredients to get the updated list
        await loadUserIngredients();
        
        // Reset form
        setSelectedIngredient(null);
        setQuantity('');
        setUnit('');
        setExpirationDate('');
        setIsAddingIngredient(false);
      } else {
        setError(response.message || 'Failed to add ingredient');
      }
    } catch (error) {
      console.error('Error adding ingredient:', error);
      setError('Failed to add ingredient');
    }
  };

  const handleRemoveIngredient = async (userIngredientId: number) => {
    if (!token) return;

    try {
      const response = await ingredientsApi.removeUserIngredient(userIngredientId, token);
      
      if (response.success) {
        setUserIngredients(prev => 
          prev.filter(item => item.id !== userIngredientId)
        );
      } else {
        setError(response.message || 'Failed to remove ingredient');
      }
    } catch (error) {
      console.error('Error removing ingredient:', error);
      setError('Failed to remove ingredient');
    }
  };

  const cancelAddIngredient = () => {
    setSelectedIngredient(null);
    setQuantity('');
    setUnit('');
    setExpirationDate('');
    setIsAddingIngredient(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!isAuthenticated) {
    return (
      <div className="pantry-manager">
        <div className="auth-required">
          Please log in to manage your pantry ingredients.
        </div>
      </div>
    );
  }

  return (
    <div className="pantry-manager">
      <div className="pantry-header">
        <h2>My Pantry</h2>
        <p>Add and manage ingredients you have available for cooking.</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}

      {/* Add Ingredient Section */}
      <div className="add-ingredient-section">
        {!isAddingIngredient ? (
          <IngredientSearch
            onIngredientSelect={handleIngredientSelect}
            placeholder="Search ingredients to add to your pantry..."
            className="pantry-search"
          />
        ) : (
          <form onSubmit={handleAddIngredient} className="add-ingredient-form">
            <div className="selected-ingredient">
              <strong>{selectedIngredient?.name}</strong>
              <span className="ingredient-category">({selectedIngredient?.category})</span>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="quantity">Quantity (optional)</label>
                <input
                  type="number"
                  id="quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  step="0.1"
                  min="0"
                  placeholder="e.g., 2"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="unit">Unit (optional)</label>
                <select
                  id="unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  <option value="">Select unit</option>
                  {selectedIngredient?.commonUnits.map(commonUnit => (
                    <option key={commonUnit} value={commonUnit}>
                      {commonUnit}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="expiration">Expiration Date (optional)</label>
              <input
                type="date"
                id="expiration"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Add to Pantry
              </button>
              <button type="button" onClick={cancelAddIngredient} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* User Ingredients List */}
      <div className="ingredients-list">
        {isLoading ? (
          <div className="loading">Loading your pantry ingredients...</div>
        ) : userIngredients.length > 0 ? (
          <>
            <h3>Your Ingredients ({userIngredients.length})</h3>
            <div className="ingredients-grid">
              {userIngredients.map((userIngredient) => (
                <div key={userIngredient.id} className="ingredient-card">
                  <div className="ingredient-info">
                    <div className="ingredient-name">{userIngredient.ingredient.name}</div>
                    <div className="ingredient-category">{userIngredient.ingredient.category}</div>
                    {userIngredient.quantity && userIngredient.unit && (
                      <div className="ingredient-quantity">
                        {userIngredient.quantity} {userIngredient.unit}
                      </div>
                    )}
                    {userIngredient.expirationDate && (
                      <div className="ingredient-expiration">
                        Expires: {formatDate(userIngredient.expirationDate)}
                      </div>
                    )}
                    <div className="ingredient-added">
                      Added: {formatDate(userIngredient.addedAt)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveIngredient(userIngredient.id)}
                    className="remove-btn"
                    title="Remove from pantry"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="empty-pantry">
            <p>Your pantry is empty.</p>
            <p>Search for ingredients above to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PantryManager;