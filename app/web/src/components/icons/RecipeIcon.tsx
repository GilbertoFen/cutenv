'use client';

import React, { useState } from 'react';
import { getRecipeCategoryIcon } from '@/lib/icons/categoryIcons';

export interface RecipeIconProps {
  category?: string | null;
  imageUrl?: string | null;
  name?: string;
  size?: number;
  className?: string;
  containerClassName?: string;
  variant?: 'bare' | 'badge' | 'card';
}

/**
 * Componente que muestra la imagen de la receta si existe,
 * o el icono SVG predeterminado según la categoría con fallback seguro.
 */
export const RecipeIcon: React.FC<RecipeIconProps> = ({
  category,
  imageUrl,
  name = 'Receta',
  size = 20,
  className = '',
  containerClassName = '',
  variant = 'badge',
}) => {
  const [imgError, setImgError] = useState(false);

  // Si tiene imagen y no ha fallado, mostrar la imagen
  if (imageUrl && !imgError) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={`object-cover rounded-md ${className}`}
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    );
  }

  const IconComponent = getRecipeCategoryIcon(category);

  if (variant === 'bare') {
    return (
      <IconComponent
        size={size}
        className={`inline-block shrink-0 ${className}`}
        aria-hidden="true"
      />
    );
  }

  // Variante badge o card con fondo sutil
  return (
    <div
      className={`inline-flex items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0 ${containerClassName}`}
      style={{
        width: typeof size === 'number' ? Math.max(size + 12, 32) : undefined,
        height: typeof size === 'number' ? Math.max(size + 12, 32) : undefined,
      }}
      title={category || 'Receta'}
      aria-label={category || 'Receta'}
    >
      <IconComponent
        size={size}
        className={className}
        aria-hidden="true"
      />
    </div>
  );
};

export default RecipeIcon;
