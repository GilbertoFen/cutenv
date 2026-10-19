import React from 'react';
import { CategoryIcon } from '@/components/icons/CategoryIcon';
import { AppIcon } from '@/components/icons/AppIcon';
import { IconName } from '@/lib/icons/iconRegistry';

interface InventoryCardProps {
  title: string;
  category?: string;
  icon?: IconName;
  onClick?: () => void;
}

export const InventoryCard: React.FC<InventoryCardProps> = ({ title, category, icon, onClick }) => (
  <button
    className="w-full sm:w-44 h-36 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-400 rounded-xl flex flex-col items-center justify-center text-center text-sm font-semibold p-4 shadow-sm hover:shadow transition-all group"
    onClick={onClick}
  >
    <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform border border-indigo-100">
      {icon ? (
        <AppIcon name={icon} size={22} />
      ) : category ? (
        <CategoryIcon category={category} type="ingredient" size={22} />
      ) : (
        <AppIcon name="inventory" size={22} />
      )}
    </div>
    <span className="text-slate-800 text-xs sm:text-sm font-bold">{title}</span>
  </button>
);

export default InventoryCard;
