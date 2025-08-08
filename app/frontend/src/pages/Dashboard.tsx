import React from 'react';
import { InventoryCard } from '../components/InventoryCard';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const panels = [
    { name: 'Gestión de inventario', route: '/inventory' },
    { name: 'Reporte de ventas' },
    { name: 'Gestión de empleados' },
    { name: 'Registro de Platillos' },
    { name: 'Otra cosa' },
    { name: 'Análisis avanzado' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-indigo-900 text-white py-4 px-8 text-xl font-semibold">Panel de control</header>
      <div className="p-8 grid grid-cols-2 md:grid-cols-3 gap-6">
        {panels.map(({ name, route }) => (
          <InventoryCard key={name} title={name} onClick={() => route && navigate(route)} />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
