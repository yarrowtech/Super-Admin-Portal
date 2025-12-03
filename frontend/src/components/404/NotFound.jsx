import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  const handleBackToHome = () => {
    navigate('/login');
  };

  // Create snowflakes dynamically
  useEffect(() => {
    const snowflakesContainer = document.querySelector('.snowflakes');
    if (!snowflakesContainer) return;

    // Clear existing snowflakes
    snowflakesContainer.innerHTML = '';

    // Create 60 snowflakes (more for winter effect)
    for (let i = 0; i < 60; i++) {
      const snowflake = document.createElement('div');
      snowflake.className = 'snowflake';
      
      // Random properties for each snowflake
      const size = Math.random() * 12 + 5; // 5-17px
      const left = Math.random() * 100; // 0-100%
      const animationDuration = Math.random() * 15 + 10; // 10-25s
      const animationDelay = Math.random() * 5; // 0-5s
      const opacity = Math.random() * 0.7 + 0.3; // 0.3-1.0
      const blur = Math.random() * 4; // 0-4px
      const isStarShaped = Math.random() > 0.7; // 30% chance of being star-shaped
      
      snowflake.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: ${isStarShaped ? 
          'conic-gradient(from 0deg, #E0E7FF, #C7D2FE, #A5B4FC, #C7D2FE, #E0E7FF)' : 
          'radial-gradient(circle, #E0E7FF 0%, #C7D2FE 50%, #A5B4FC 100%)'
        };
        border-radius: ${isStarShaped ? '10%' : '50%'};
        filter: blur(${blur}px);
        left: ${left}%;
        top: -20px;
        opacity: ${opacity};
        animation: fall ${animationDuration}s linear ${animationDelay}s infinite;
        pointer-events: none;
        ${isStarShaped ? 'clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);' : ''}
      `;
      
      snowflakesContainer.appendChild(snowflake);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 dark:bg-background-dark flex flex-col items-center justify-center px-4 font-display relative overflow-hidden">
      {/* Snowflakes Container */}
      <div className="snowflakes absolute inset-0 overflow-hidden pointer-events-none"></div>
      
      {/* Christmas Lights String */}
      <div className="absolute top-0 left-0 right-0 h-12 flex justify-around pointer-events-none z-20">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 opacity-30"></div>
        {Array.from({ length: 25 }).map((_, i) => (
          <div 
            key={i}
            className="relative w-6 h-6 rounded-full animate-pulse"
            style={{
              backgroundColor: i % 5 === 0 ? '#EF4444' : 
                              i % 5 === 1 ? '#F59E0B' : 
                              i % 5 === 2 ? '#10B981' : 
                              i % 5 === 3 ? '#3B82F6' : 
                              '#8B5CF6',
              animationDelay: `${i * 0.15}s`,
              animationDuration: `${0.5 + Math.random() * 1}s`,
              filter: 'drop-shadow(0 0 12px currentColor)',
              top: i % 2 === 0 ? '4px' : '12px'
            }}
          >
            {/* Light glow */}
            <div className="absolute inset-0 rounded-full bg-current opacity-30 animate-ping" style={{animationDelay: `${i * 0.1}s`}}></div>
          </div>
        ))}
      </div>

      {/* Pine Trees Vector Art - Left Side */}
      <div className="absolute left-4 bottom-0 w-64 h-96 pointer-events-none z-10">
        {/* Tree 1 - Close */}
        <div className="absolute bottom-0 left-0 w-48 h-64">
          {/* Tree trunk */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-24 bg-gradient-to-b from-yellow-900 to-yellow-800 rounded-t-lg"></div>
          
          {/* Tree layers */}
          <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 w-40 h-24 bg-gradient-to-b from-emerald-700 to-emerald-800 clip-path-triangle"></div>
          <div className="absolute bottom-28 left-1/2 transform -translate-x-1/2 w-32 h-24 bg-gradient-to-b from-emerald-600 to-emerald-700 clip-path-triangle"></div>
          <div className="absolute bottom-40 left-1/2 transform -translate-x-1/2 w-24 h-24 bg-gradient-to-b from-emerald-500 to-emerald-600 clip-path-triangle"></div>
          <div className="absolute bottom-52 left-1/2 transform -translate-x-1/2 w-16 h-16 bg-gradient-to-b from-emerald-400 to-emerald-500 clip-path-triangle"></div>
          
          {/* Tree star */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-gradient-to-b from-yellow-300 to-yellow-500 clip-path-star animate-twinkle"></div>
          
          {/* Christmas decorations */}
          <div className="absolute bottom-32 left-1/4 w-4 h-4 bg-red-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          <div className="absolute bottom-40 right-1/3 w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.8s'}}></div>
          <div className="absolute bottom-48 left-2/3 w-5 h-5 bg-yellow-500 rounded-full animate-bounce" style={{animationDelay: '0.5s'}}></div>
          <div className="absolute bottom-20 right-1/4 w-4 h-4 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '1.1s'}}></div>
        </div>
        
        {/* Snow on tree */}
        <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 w-40 h-4 bg-gradient-to-b from-white to-blue-50 opacity-40 rounded-full blur-sm"></div>
      </div>

      {/* Pine Trees Vector Art - Right Side */}
      <div className="absolute right-4 bottom-0 w-80 h-80 pointer-events-none z-10">
        {/* Tree 2 - Medium */}
        <div className="absolute bottom-0 right-4 w-64 h-80">
          {/* Tree trunk */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-10 h-32 bg-gradient-to-b from-yellow-900 to-yellow-800 rounded-t-lg"></div>
          
          {/* Tree layers */}
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-56 h-32 bg-gradient-to-b from-green-800 to-green-900 clip-path-triangle"></div>
          <div className="absolute bottom-40 left-1/2 transform -translate-x-1/2 w-44 h-32 bg-gradient-to-b from-green-700 to-green-800 clip-path-triangle"></div>
          <div className="absolute bottom-60 left-1/2 transform -translate-x-1/2 w-32 h-28 bg-gradient-to-b from-green-600 to-green-700 clip-path-triangle"></div>
          <div className="absolute bottom-80 left-1/2 transform -translate-x-1/2 w-20 h-20 bg-gradient-to-b from-green-500 to-green-600 clip-path-triangle"></div>
          
          {/* Tree star */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-10 h-10 bg-gradient-to-b from-yellow-200 to-yellow-400 clip-path-star animate-twinkle" style={{animationDelay: '0.3s'}}></div>
          
          {/* Christmas decorations */}
          <div className="absolute bottom-40 left-1/3 w-6 h-6 bg-red-600 rounded-full animate-pulse" style={{animationDelay: '0.7s'}}></div>
          <div className="absolute bottom-28 right-1/4 w-4 h-4 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '1.3s'}}></div>
          <div className="absolute bottom-55 left-1/2 w-5 h-5 bg-yellow-400 rounded-full animate-pulse" style={{animationDelay: '0.9s'}}></div>
          <div className="absolute bottom-68 left-1/5 w-5 h-5 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
        </div>
      </div>

      {/* Background Small Trees */}
      <div className="absolute left-8 bottom-4 w-40 h-48 opacity-50 pointer-events-none">
        <div className="absolute bottom-0 left-0 w-32 h-40">
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-16 bg-gradient-to-b from-yellow-800 to-yellow-900 rounded-t-lg"></div>
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-28 h-20 bg-gradient-to-b from-emerald-800 to-emerald-900 clip-path-triangle"></div>
          <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 w-20 h-20 bg-gradient-to-b from-emerald-700 to-emerald-800 clip-path-triangle"></div>
        </div>
      </div>

      {/* Background Hills with Snow */}
      <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none z-5">
        <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-b from-gray-800 via-gray-900 to-black"></div>
        {/* Snow layer on hills */}
        <div className="absolute bottom-40 left-0 w-full h-8 bg-gradient-to-b from-white to-blue-100 opacity-30 rounded-t-full blur-md"></div>
        <div className="absolute bottom-40 left-1/4 w-1/2 h-6 bg-gradient-to-b from-white to-blue-100 opacity-40 rounded-t-full blur-sm"></div>
      </div>

      {/* Floating background elements with Christmas colors */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-5">
        {/* Floating ornaments */}
        <div className="absolute top-1/4 left-20 w-8 h-8 bg-red-500 rounded-full opacity-40 animate-float"></div>
        <div className="absolute top-16 right-32 w-6 h-6 bg-green-500 rounded-full opacity-50 animate-float" style={{animationDelay: '1.2s'}}></div>
        <div className="absolute bottom-1/3 left-24 w-10 h-10 bg-yellow-500 rounded-full opacity-30 animate-float" style={{animationDelay: '0.7s'}}></div>
        
        {/* Christmas wreath */}
        <div className="absolute top-1/3 right-16 w-24 h-24 rounded-full border-8 border-green-600 border-dashed opacity-20 animate-spin" style={{animationDuration: '25s'}}></div>
        <div className="absolute bottom-1/4 left-1/3 w-20 h-20 rounded-full border-6 border-red-500 border-dashed opacity-15 animate-spin" style={{animationDuration: '30s', animationDirection: 'reverse'}}></div>
      </div>

      {/* Main 404 Illustration */}
      <div className="text-center max-w-4xl relative z-30">
        {/* Large 404 Text with People Climbing - Christmas themed */}
        <div className="relative mb-16">
          {/* 404 Text */}
          <div className="flex items-center justify-center space-x-4 mb-8">
            {/* "4" */}
            <div className="relative">
              <span className="text-9xl font-black text-red-400 leading-none drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]">4</span>
              {/* Person on "4" (Santa) */}
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                <div className="w-6 h-6 bg-red-500 rounded-full"></div>
                <div className="w-4 h-8 bg-red-600 mx-auto mt-1"></div>
                <div className="flex justify-center mt-1">
                  <div className="w-2 h-4 bg-red-500 transform -rotate-12"></div>
                  <div className="w-2 h-4 bg-red-500 transform rotate-12"></div>
                </div>
              </div>
            </div>

            {/* "0" */}
            <div className="relative">
              <span className="text-9xl font-black text-green-400 leading-none drop-shadow-[0_0_20px_rgba(34,197,94,0.8)]">0</span>
              {/* Person on top of "0" (Elf) */}
              <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
                <div className="w-6 h-6 bg-green-400 rounded-full"></div>
                <div className="w-4 h-8 bg-green-600 mx-auto mt-1"></div>
                <div className="flex justify-center mt-1 space-x-1">
                  <div className="w-1 h-3 bg-green-400 transform rotate-45"></div>
                  <div className="w-1 h-3 bg-green-400 transform -rotate-45"></div>
                </div>
              </div>
              {/* Person inside "0" (Snowman) */}
              <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
                <div className="w-4 h-4 bg-white rounded-full"></div>
                <div className="w-3 h-6 bg-white mx-auto mt-1"></div>
              </div>
            </div>

            {/* "4" */}
            <div className="relative">
              <span className="text-9xl font-black text-yellow-400 leading-none drop-shadow-[0_0_20px_rgba(250,204,21,0.8)]">4</span>
              {/* Person climbing "4" (Reindeer) */}
              <div className="absolute top-1/2 -right-8 transform -translate-y-1/2">
                <div className="w-5 h-5 bg-yellow-600 rounded-full"></div>
                <div className="w-3 h-6 bg-yellow-700 mx-auto mt-1"></div>
                <div className="flex justify-center mt-1">
                  <div className="w-2 h-3 bg-yellow-600 transform rotate-45"></div>
                  <div className="w-2 h-3 bg-yellow-600"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Christmas ornaments */}
          <div className="absolute -top-4 left-1/4 w-10 h-10 bg-red-500 rounded-full opacity-60 animate-float" style={{animationDelay: '0.2s'}}>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-4 bg-yellow-400"></div>
          </div>
          <div className="absolute top-16 -right-8 w-8 h-8 bg-green-500 rounded-full opacity-50 animate-float" style={{animationDelay: '0.8s'}}>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-4 bg-yellow-400"></div>
          </div>
          <div className="absolute -bottom-8 left-1/3 w-12 h-12 bg-yellow-500 rounded-full opacity-40 animate-float" style={{animationDelay: '1.2s'}}>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-4 bg-red-400"></div>
          </div>
        </div>

        {/* Main heading */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-4 tracking-wider drop-shadow-[0_4px_8px_rgba(0,0,0,0.7)]">
            🎄 OPPS! PAGE NOT FOUND 🎄
          </h1>
          <p className="text-lg text-gray-300 mb-2">
            The page you're looking for has vanished like Santa on Christmas Eve!
          </p>
          <p className="text-md text-gray-400 italic">
            Don't worry, Rudolph will help us find our way back!
          </p>
        </div>

        {/* Back to Home Button with Purple Glow */}
        <button
          onClick={handleBackToHome}
          className="relative bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 hover:from-purple-700 hover:via-purple-800 hover:to-purple-900 text-white font-bold py-5 px-16 rounded-full text-lg transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-3xl group overflow-hidden z-30"
          style={{
            animation: 'pulse-glow 2s ease-in-out infinite',
          }}
        >
          {/* Button inner glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 opacity-0 group-hover:opacity-30 transition-opacity duration-300 rounded-full animate-gradient-x"></div>
          
          {/* Button text with glow */}
          <span className="relative z-10 flex items-center justify-center gap-2">
            🎅 BACK TO HOME
            <span className="animate-bounce">🎁</span>
          </span>
          
          {/* Pulsing glow effect */}
          <div className="absolute inset-0 rounded-full animate-pulse-slow opacity-40"
               style={{
                 boxShadow: 'inset 0 0 40px rgba(147, 51, 234, 0.6), 0 0 60px 30px rgba(147, 51, 234, 0.4)',
               }}>
          </div>
          
          {/* Snow on button */}
          <div className="absolute -top-1 -left-2 w-3 h-3 bg-white rounded-full opacity-70 blur-sm"></div>
          <div className="absolute -top-2 right-4 w-2 h-2 bg-white rounded-full opacity-60 blur-sm"></div>
          <div className="absolute bottom-0 left-6 w-2 h-2 bg-white rounded-full opacity-50 blur-sm"></div>
        </button>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg); 
          }
          50% { 
            transform: translateY(-20px) rotate(10deg); 
          }
        }
        
        @keyframes fall {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 0.8;
          }
          100% {
            transform: translateY(calc(100vh + 20px)) rotate(720deg);
            opacity: 0.2;
          }
        }
        
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 50px rgba(147, 51, 234, 0.7), 
                        0 8px 30px rgba(147, 51, 234, 0.5),
                        0 0 100px rgba(255, 0, 255, 0.3);
          }
          50% {
            box-shadow: 0 0 80px rgba(147, 51, 234, 0.9), 
                        0 12px 40px rgba(147, 51, 234, 0.7),
                        0 0 150px rgba(255, 0, 255, 0.5);
          }
        }
        
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.08);
          }
        }
        
        @keyframes twinkle {
          0%, 100% { 
            opacity: 0.6; 
            filter: drop-shadow(0 0 10px #F59E0B);
          }
          50% { 
            opacity: 1; 
            filter: drop-shadow(0 0 20px #FBBF24);
          }
        }
        
        @keyframes gradient-x {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
        
        .animate-twinkle {
          animation: twinkle 2s ease-in-out infinite;
        }
        
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
        
        .clip-path-triangle {
          clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
        }
        
        .clip-path-star {
          clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
        }
        
        /* Glowing text effect */
        h1 {
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.3),
                       0 0 20px rgba(255, 0, 0, 0.3),
                       0 0 30px rgba(0, 255, 0, 0.2);
        }
      `}</style>
    </div>
  );
};

export default NotFound;