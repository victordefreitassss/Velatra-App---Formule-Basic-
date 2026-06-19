import React, { useState, useEffect, useRef } from 'react';
import { Input } from './UI';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

interface Feature {
  properties: {
    label: string;
    id: string;
  };
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({ value, onChange, placeholder, className }) => {
  const [suggestions, setSuggestions] = useState<Feature[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`);
      const data = await response.json();
      setSuggestions(data.features || []);
    } catch (error) {
      console.error("Erreur de recherche d'adresse", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      // Only fetch if it doesn't match an already selected suggestion
      if (value && isOpen) {
        fetchSuggestions(value);
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [value, isOpen]);

  return (
    <div className="relative" ref={wrapperRef}>
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        className={className}
      />
      {isOpen && (suggestions.length > 0 || isLoading) && (
        <div className="absolute z-50 w-full mt-1 bg-[#161B22] border border-zinc-800 rounded-xl shadow-lg overflow-hidden">
          {isLoading && suggestions.length === 0 ? (
            <div className="p-3 text-sm text-zinc-400 text-center">Recherche...</div>
          ) : (
            <ul>
              {suggestions.map((feature) => (
                <li
                  key={feature.properties.id}
                  className="px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer transition-colors border-b border-zinc-800/50 last:border-0"
                  onClick={() => {
                    onChange(feature.properties.label);
                    setIsOpen(false);
                  }}
                >
                  {feature.properties.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
