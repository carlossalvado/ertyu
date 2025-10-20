import { useState } from 'react';
import CustomersManager from '../components/Settings/CustomersManager';

export default function CustomersPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Clientes</h1>
          <p className="text-gray-600">Gerencie seus clientes e seus pacotes</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <CustomersManager />
          </div>
        </div>
      </div>
    </div>
  );
}