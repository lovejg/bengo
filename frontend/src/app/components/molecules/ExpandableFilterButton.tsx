import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ExpandableFilterButtonProps {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  selectedCount?: number;
  variant?: 'glass' | 'tag' | 'neo';
}

export function ExpandableFilterButton({
  label,
  icon,
  children,
  defaultExpanded = false,
  selectedCount = 0,
  variant = 'glass',
}: ExpandableFilterButtonProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // GLASS VARIANT - 유리 느낌
  if (variant === 'glass') {
    return (
      <motion.div 
        className="relative rounded-[16px] overflow-hidden backdrop-blur-xl border border-white/40"
        style={{
          background: isExpanded 
            ? 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.3) 100%)'
            : 'rgba(255,255,255,0.4)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
        initial={false}
        animate={{ 
          boxShadow: isExpanded 
            ? '0 8px 32px rgba(0, 0, 0, 0.1)' 
            : '0 4px 16px rgba(0, 0, 0, 0.05)',
        }}
        transition={{ duration: 0.2 }}
      >
        {/* Gradient reflection overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none" />
        
        {/* Header Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="relative w-full px-5 py-4 flex items-center justify-between gap-3 transition-all duration-200 cursor-pointer"
          aria-expanded={isExpanded}
          aria-label={`${label} 필터 ${isExpanded ? '닫기' : '열기'}`}
        >
          <div className="flex items-center gap-3">
            {icon && (
              <span className="text-[var(--accent)] drop-shadow-sm">
                {icon}
              </span>
            )}
            <span className="font-semibold text-[var(--foreground)]">{label}</span>
            {selectedCount > 0 && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-[var(--accent)]/80 backdrop-blur-sm text-white text-xs font-bold shadow-lg"
              >
                {selectedCount}
              </motion.span>
            )}
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="w-6 h-6 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center">
              <ChevronDown className="h-4 w-4 text-[var(--foreground)]" strokeWidth={2.5} />
            </div>
          </motion.div>
        </button>

        {/* Expandable Content */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ 
                height: 'auto', 
                opacity: 1,
              }}
              exit={{ 
                height: 0, 
                opacity: 0,
              }}
              transition={{ 
                duration: 0.2, 
                ease: [0.4, 0, 0.2, 1],
              }}
              className="overflow-hidden"
            >
              <div className="relative px-5 py-4 border-t border-white/30">
                {/* Frosted background for content area */}
                <div className="absolute inset-0 bg-white/20 backdrop-blur-sm" />
                <div className="relative">
                  {children}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // TAG VARIANT - 귀여운 태그 스타일
  if (variant === 'tag') {
    const tagColor = isExpanded 
      ? 'bg-gradient-to-br from-purple-500 to-pink-500'
      : 'bg-gradient-to-br from-purple-100 to-pink-100';
    
    return (
      <motion.div 
        className={`relative rounded-[20px] overflow-hidden border-3 transition-all duration-200 ${
          isExpanded ? 'border-purple-500 shadow-xl shadow-purple-200' : 'border-purple-200'
        }`}
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.15 }}
      >
        {/* Cute pattern background */}
        <div className={`absolute inset-0 ${tagColor} opacity-${isExpanded ? '100' : '50'}`} />
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 0L0 10l10 10 10-10L10 0z' fill='%23fff'/%3E%3C/svg%3E")`,
            backgroundSize: '20px 20px',
          }}
        />
        
        {/* Header Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="relative w-full px-4 py-3.5 flex items-center justify-between gap-3 cursor-pointer"
          aria-expanded={isExpanded}
          aria-label={`${label} 필터 ${isExpanded ? '닫기' : '열기'}`}
        >
          <div className="flex items-center gap-2.5">
            {icon && (
              <motion.span 
                className={`${isExpanded ? 'text-white' : 'text-purple-600'}`}
                animate={{ rotate: isExpanded ? [0, -10, 10, 0] : 0 }}
                transition={{ duration: 0.4 }}
              >
                {icon}
              </motion.span>
            )}
            <span className={`font-bold text-sm ${isExpanded ? 'text-white' : 'text-purple-900'}`}>
              {label}
            </span>
            {selectedCount > 0 && (
              <motion.span 
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-white text-purple-600 text-xs font-black shadow-md border-2 border-purple-300"
              >
                {selectedCount}
              </motion.span>
            )}
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
              isExpanded ? 'bg-white/30' : 'bg-purple-200'
            }`}>
              <ChevronDown className={`h-4 w-4 ${isExpanded ? 'text-white' : 'text-purple-600'}`} strokeWidth={3} />
            </div>
          </motion.div>
        </button>

        {/* Expandable Content */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ 
                height: 'auto', 
                opacity: 1,
              }}
              exit={{ 
                height: 0, 
                opacity: 0,
              }}
              transition={{ 
                duration: 0.2, 
                ease: [0.4, 0, 0.2, 1],
              }}
              className="overflow-hidden"
            >
              <div className="relative px-4 py-4 bg-white/90 backdrop-blur-sm">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cute corner decoration */}
        {!isExpanded && (
          <div className="absolute top-2 right-2 text-xs">
            <span className="opacity-60">💝</span>
          </div>
        )}
      </motion.div>
    );
  }

  // NEO VARIANT - Neo Brutalism
  if (variant === 'neo') {
    return (
      <motion.div 
        className="relative rounded-none border-4 border-black overflow-hidden bg-white"
        style={{
          boxShadow: isExpanded 
            ? '8px 8px 0 0 black'
            : '6px 6px 0 0 black',
        }}
        animate={{
          x: isExpanded ? -2 : 0,
          y: isExpanded ? -2 : 0,
        }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
      >
        {/* Bold stripes pattern */}
        {isExpanded && (
          <div 
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, black 0, black 3px, transparent 3px, transparent 10px)',
            }}
          />
        )}
        
        {/* Header Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`relative w-full px-5 py-4 flex items-center justify-between gap-3 transition-colors duration-150 cursor-pointer ${
            isExpanded ? 'bg-[var(--accent)]' : 'bg-white hover:bg-yellow-100'
          }`}
          aria-expanded={isExpanded}
          aria-label={`${label} 필터 ${isExpanded ? '닫기' : '열기'}`}
        >
          <div className="flex items-center gap-3">
            {icon && (
              <span className={isExpanded ? 'text-white' : 'text-black'}>
                {icon}
              </span>
            )}
            <span className={`font-black uppercase text-sm tracking-wider ${
              isExpanded ? 'text-white' : 'text-black'
            }`}>
              {label}
            </span>
            {selectedCount > 0 && (
              <motion.span 
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                className="inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-none bg-black text-yellow-400 text-xs font-black border-2 border-yellow-400"
                style={{
                  boxShadow: '2px 2px 0 0 rgba(0,0,0,0.3)',
                }}
              >
                {selectedCount}
              </motion.span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Status indicator */}
            <div className={`w-3 h-3 ${isExpanded ? 'bg-yellow-400' : 'bg-black'} rotate-45`} />
            
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className={`w-8 h-8 rounded-none flex items-center justify-center border-3 ${
                isExpanded 
                  ? 'bg-white border-white' 
                  : 'bg-black border-black'
              }`}
            >
              <ChevronDown className={`h-5 w-5 ${isExpanded ? 'text-[var(--accent)]' : 'text-white'}`} strokeWidth={4} />
            </motion.div>
          </div>
        </button>

        {/* Expandable Content */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ 
                height: 'auto', 
                opacity: 1,
              }}
              exit={{ 
                height: 0, 
                opacity: 0,
              }}
              transition={{ 
                duration: 0.2, 
                ease: [0.4, 0, 0.2, 1],
              }}
              className="overflow-hidden"
            >
              <div className="relative px-5 py-5 border-t-4 border-black bg-gray-50">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Corner accent */}
        <div className={`absolute top-0 left-0 w-0 h-0 border-t-[12px] border-l-[12px] ${
          isExpanded ? 'border-t-yellow-400 border-l-yellow-400' : 'border-t-transparent border-l-transparent'
        } transition-all duration-200`} />
      </motion.div>
    );
  }

  return null;
}
