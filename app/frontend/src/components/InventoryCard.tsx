import React from 'react';

interface InventoryCardProps {
  title: string;
  onClick?: () => void;
}

export const InventoryCard: React.FC<InventoryCardProps> = ({ title, onClick }) => (
  <button
    className="w-32 h-32 bg-gray-200 hover:bg-gray-300 rounded-md flex items-center justify-center text-center text-sm font-semibold p-2 shadow-md"
    onClick={onClick}
  >
    {title}
  </button>
);

