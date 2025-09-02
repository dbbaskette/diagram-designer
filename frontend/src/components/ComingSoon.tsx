import React from 'react';

interface ComingSoonProps {
  title: string;
}

const ComingSoon: React.FC<ComingSoonProps> = ({ title }) => {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="card text-center max-w-md mx-auto">
        <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <i className="fas fa-hard-hat text-yellow-400 text-3xl"></i>
        </div>
        
        <h2 className="text-2xl font-semibold text-white mb-3">{title}</h2>
        
        <p className="text-gray-400 mb-6">
          This feature is currently under development and will be available soon.
        </p>
        
        <div className="flex items-center justify-center gap-2 text-sm text-yellow-400">
          <i className="fas fa-clock"></i>
          <span>Coming Soon</span>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;