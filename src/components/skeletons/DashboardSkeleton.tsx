import React from 'react';

export const DashboardSkeleton = () => {
  return (
    <div className="space-y-6 w-full bg-gray-50 p-6 min-h-screen animate-pulse">
      {/* 3 wide KPI card blocks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
      
      {/* 1 wide chart block */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-64 flex flex-col">
        <div className="h-5 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="flex-1 bg-gray-100 rounded w-full"></div>
      </div>
    </div>
  );
};
