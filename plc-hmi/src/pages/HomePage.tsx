import React from 'react';

export const HomePage: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Header da página */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-edp-marine mb-4">Sistema HMI</h1>
        <p className="text-lg text-edp-slate">Automação Industrial</p>
      </div>

      {/* Área para widgets da home page */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aqui você pode adicionar cards de status, estatísticas, etc. */}
      </div>
    </div>
  );
};
