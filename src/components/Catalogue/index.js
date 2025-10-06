import React, { useState } from 'react';
import './index.css';

const Catalogue = ({ 
  value = [], 
  onChange, 
  placeholder = "web developer, interior designer, event manager, video editor, SMM, etc.,",
  maxTags = 10,
  disabled = false 
}) => {
  const [inputValue, setInputValue] = useState('');

  const addTag = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !value.includes(trimmedValue) && value.length < maxTags) {
      const newTags = [...value, trimmedValue];
      onChange(newTags);
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove) => {
    const newTags = value.filter(tag => tag !== tagToRemove);
    onChange(newTags);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  return (
    <div className={`catalogue ${disabled ? 'catalogue--disabled' : ''}`}>
      <div className="catalogue-input-section">
        <div className="catalogue-input-container">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="catalogue-input"
            disabled={disabled || value.length >= maxTags}
          />
          <button
            type="button"
            onClick={addTag}
            className="catalogue-add-btn"
            disabled={disabled || !inputValue.trim() || value.includes(inputValue.trim()) || value.length >= maxTags}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </button>
        </div>
      </div>
      
      {value.length > 0 && (
        <div className="catalogue-tags">
          {value.map((tag, index) => (
            <div key={index} className="catalogue-tag">
              <span className="catalogue-tag-text">{tag}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="catalogue-tag-remove"
                  aria-label={`Remove ${tag}`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      
      {value.length >= maxTags && (
        <div className="catalogue-limit-message">
          Maximum {maxTags} tags allowed
        </div>
      )}
    </div>
  );
};

export default Catalogue;
