import React from 'react';

export const OrderListSkeleton = () => {
  return (
    <div className="space-y-4 w-full bg-gray-50 p-4 min-h-screen">
      {/* 5 rows of gray animated blocks matching the shape of real order cards */}
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center animate-pulse">
          <div className="space-y-3 w-2/3">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="h-8 bg-gray-200 rounded-full w-20"></div>
        </div>
      ))}
    </div>
  );
};
