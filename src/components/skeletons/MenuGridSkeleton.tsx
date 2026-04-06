import React from 'react';

export const MenuGridSkeleton = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full bg-gray-50 p-4 min-h-screen">
      {/* 8 cards of gray blocks matching menu item card dimensions */}
      {[...Array(8)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
          <div className="h-32 bg-gray-200 w-full"></div>
          <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="pt-2">
              <div className="h-8 bg-gray-200 rounded-lg w-full"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
