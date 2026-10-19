import React from 'react';
import { getRecipeCategoryIcon, getIngredientCategoryIcon } from '@/lib/icons/categoryIcons';
import { Layers } from 'lucide-react';

export interface CategoryIconProps {
  category?: string | null;
  type?: 'recipe' | 'ingredient' | 'general';
  size?: number;
  className?: string;
  containerClassName?: string;
  variant?: 'bare' | 'badge';
}

/**
 * Componente que muestra el icono SVG adecuado para cualquier categoría del POS.
 */
export const CategoryIcon: React.FC<CategoryIconProps> = ({
  category,
  type = 'general',
  size = 18,
  className = '',
  containerClassName = '',
  variant = 'bare',
}) => {
  let IconComponent = Layers;

  if (type === 'recipe') {
    IconComponent = getRecipeCategoryIcon(category);
  } else if (type === 'ingredient') {
    IconComponent = getIngredientCategoryIcon(category);
  } else {
    // Modo general: intenta primero receta, si devuelve Utensils prueba ingrediente
    const recIcon = getRecipeCategoryIcon(category);
    IconComponent = recIcon;
  }

  if (variant === 'badge') {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 shrink-0 ${containerClassName}`}
        style={{
          width: typeof size === 'number' ? size + 10 : undefined,
          height: typeof size === 'number' ? size + 10 : undefined,
        }}
        title={category || 'Categoría'}
      >
        <IconComponent size={size} className={className} aria-hidden="true" />
      </div>
    );
  }

  return (
    <IconComponent
      size={size}
      className={`inline-block shrink-0 align-middle ${className}`}
      aria-hidden="true"
    />
  );
};

export default CategoryIcon;
