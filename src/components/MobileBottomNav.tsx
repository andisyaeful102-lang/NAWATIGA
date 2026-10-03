import React from 'react';
import { UtensilsCrossed, ClipboardList, MessageSquare } from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: 'chat' | 'menu' | 'orders';
  onSelectTab: (tab: 'chat' | 'menu' | 'orders') => void;
  activeOrderCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  activeOrderCount,
}) => {
  const tabs = [
    { id: 'menu' as const, label: 'Menu Digital', icon: UtensilsCrossed },
    ...(activeOrderCount > 0
      ? [{ id: 'orders' as const, label: `Pesanan (${activeOrderCount})`, icon: ClipboardList, badge: true }]
      : []),
    { id: 'chat' as const, label: 'Tanya AI', icon: MessageSquare, badgeText: 'AI' },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/90 pb-safe pt-1.5 px-2 shadow-[0_-10px_25px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-white font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'scale-110 stroke-[2.5]' : 'stroke-[1.75]'
                  }`}
                />
                {tab.badge && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-zinc-950 animate-ping" />
                )}
                {tab.badgeText && !isActive && (
                  <span className="absolute -top-1.5 -right-3 text-[9px] font-mono px-1 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {tab.badgeText}
                  </span>
                )}
              </div>
              <span className={`text-[10px] tracking-tight mt-0.5 ${isActive ? 'font-black text-white' : 'font-medium'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-white mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
