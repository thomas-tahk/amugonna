import React, { useState, useEffect, useMemo } from 'react';
import { Ingredient } from '../types';
import { ingredientsApi } from '../services/api';
import './IngredientSearch.css';

interface IngredientSearchProps {
  onIngredientSelect: (ingredient: Ingredient) => void;
  placeholder?: string;
  className?: string;
}

const IngredientSearch: React.FC<IngredientSearchProps> = ({
  onIngredientSelect,
  placeholder = 'Search for ingredients...',
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Debounce search term
  const debouncedSearchTerm = useMemo(() => {
    const timer = setTimeout(() => searchTerm, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const searchIngredients = async () => {
      if (!searchTerm.trim()) {
        setIngredients([]);
        setShowDropdown(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await ingredientsApi.search({
          search: searchTerm,
          limit: 10,
        });

        if (response.success && response.data) {
          setIngredients(response.data.ingredients);
          setShowDropdown(true);
          setSelectedIndex(-1);
        } else {
          setIngredients([]);
          setShowDropdown(false);
        }
      } catch (error) {
        console.error('Ingredient search error:', error);
        setIngredients([]);
        setShowDropdown(false);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce the search
    const timeoutId = setTimeout(searchIngredients, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleIngredientClick = (ingredient: Ingredient) => {
    onIngredientSelect(ingredient);
    setSearchTerm('');
    setShowDropdown(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < ingredients.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < ingredients.length) {
          handleIngredientClick(ingredients[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleBlur = () => {
    // Delay hiding dropdown to allow for clicks
    setTimeout(() => {
      setShowDropdown(false);
      setSelectedIndex(-1);
    }, 200);
  };

  return (
    <div className={`ingredient-search ${className}`}>
      <div className="search-input-container">
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={() => searchTerm && setShowDropdown(true)}
          placeholder={placeholder}
          className="search-input"
        />
        {isLoading && <div className="search-loading">⏳</div>}
      </div>

      {showDropdown && (
        <div className="search-dropdown">
          {ingredients.length > 0 ? (
            ingredients.map((ingredient, index) => (
              <div
                key={ingredient.id}
                className={`search-result ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleIngredientClick(ingredient)}
              >
                <div className="ingredient-name">{ingredient.name}</div>
                <div className="ingredient-category">{ingredient.category}</div>
              </div>
            ))
          ) : (
            <div className="no-results">
              {searchTerm ? 'No ingredients found' : 'Start typing to search'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IngredientSearch;