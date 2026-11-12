'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { AppIcon } from '@/components/icons';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  searchable?: boolean;
  className?: string;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecciona una opción…',
  label,
  error,
  disabled = false,
  searchable = false,
  className = '',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const selectedOption = options.find((opt) => opt.value === value);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, searchable]);

  const filteredOptions = searchable && searchTerm.trim() !== ''
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opt.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (opt.description && opt.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : options;

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-slate-700 mb-1">
          {label}
        </label>
      )}

      {/* Button trigger */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setSearchTerm('');
          }
        }}
        className={`w-full text-xs px-3 py-2 border rounded-xl bg-white text-left flex items-center justify-between gap-2 transition-all ${
          disabled
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            : isOpen
            ? 'border-indigo-500 ring-2 ring-indigo-200'
            : error
            ? 'border-rose-300 ring-1 ring-rose-200'
            : 'border-slate-300 hover:border-slate-400 text-slate-900'
        }`}
      >
        <span className={`truncate ${!selectedOption ? 'text-slate-400' : 'font-medium'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {error && <p className="text-[11px] text-rose-600 mt-1">{error}</p>}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-soft-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {searchable && (
            <div className="p-2 border-b border-slate-100 bg-slate-50/70">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar opción…"
                  className="w-full pl-7 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <div className="absolute left-2 top-2 text-slate-400">
                  <AppIcon name="search" size={11} />
                </div>
              </div>
            </div>
          )}

          <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">
                No se encontraron opciones
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full px-3 py-2 text-left rounded-xl text-xs flex items-center justify-between gap-2 transition ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-900 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate">{opt.label}</p>
                      {opt.description && (
                        <p className="text-[10px] text-slate-400 truncate">{opt.description}</p>
                      )}
                    </div>
                    {isSelected && (
                      <span className="text-indigo-600 shrink-0 font-bold">✓</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
