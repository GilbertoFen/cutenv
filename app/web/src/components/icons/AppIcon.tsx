import React from 'react';
import { ICON_REGISTRY, IconName } from '@/lib/icons/iconRegistry';
import { Package } from 'lucide-react';

export interface AppIconProps {
  name: IconName;
  size?: number | string;
  className?: string;
  color?: string;
  ariaLabel?: string;
  ariaHidden?: boolean;
}

/**
 * Componente SVG centralizado para iconografía de interfaz en el POS.
 * Utiliza currentColor por defecto para integrarse con los estilos existentes.
 */
export const AppIcon: React.FC<AppIconProps> = ({
  name,
  size = 18,
  className = '',
  color,
  ariaLabel,
  ariaHidden = !ariaLabel,
}) => {
  const IconComponent = ICON_REGISTRY[name] || Package;

  return (
    <IconComponent
      size={size}
      color={color}
      className={`inline-block shrink-0 align-middle ${className}`}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
      role={ariaLabel ? 'img' : undefined}
    />
  );
};

export default AppIcon;
