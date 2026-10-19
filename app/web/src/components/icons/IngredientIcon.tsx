'use client';

import React, { useState } from 'react';
import { getIngredientCategoryIcon } from '@/lib/icons/categoryIcons';

export interface IngredientIconProps {
  category?: string | null;
  imageUrl?: string | null;
  name?: string;
  size?: number;
  className?: string;
  containerClassName?: string;
  variant?: 'bare' | 'badge' | 'card';
}

/**
 * Componente que muestra la imagen del insumo si existe,
 * o el icono SVG predeterminado según la categoría con fallback seguro.
 */
export const IngredientIcon: React.FC<IngredientIconProps> = ({
  category,
  imageUrl,
  name = 'Insumo',
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

  const IconComponent = getIngredientCategoryIcon(category);

  if (variant === 'bare') {
    return (
      <IconComponent
        size={size}
        className={`inline-block shrink-0 ${className}`}
        aria-hidden="true"
      />
    );
  }

  // Variante badge o card con fondo sutil amigable
  return (
    <div
      className={`inline-flex items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 shrink-0 ${containerClassName}`}
      style={{
        width: typeof size === 'number' ? Math.max(size + 12, 32) : undefined,
        height: typeof size === 'number' ? Math.max(size + 12, 32) : undefined,
      }}
      title={category || 'Insumo'}
      aria-label={category || 'Insumo'}
    >
      <IconComponent
        size={size}
        className={className}
        aria-hidden="true"
      />
    </div>
  );
};

export default IngredientIcon;
