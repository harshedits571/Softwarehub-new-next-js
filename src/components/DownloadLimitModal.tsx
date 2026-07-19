import React from "react";

interface DownloadLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export default function DownloadLimitModal({ isOpen, onClose, onUpgrade }: DownloadLimitModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#0d0d12]/95 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 sm:p-10 shadow-[0_0_80px_rgba(79,70,229,0.15)] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Subtle top gradient line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-50"></div>
        
        {/* Decorative background glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-brand-600/20 rounded-full blur-[3rem] pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-600/10 rounded-full blur-[3rem] pointer-events-none"></div>

        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all z-20"
        >
          <i className="fa-solid fa-times text-sm"></i>
        </button>

        <div className="text-center relative z-10">
          <div className="relative inline-flex items-center justify-center mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-600 to-indigo-400 rounded-2xl blur-lg opacity-40 animate-pulse"></div>
            <div className="relative w-16 h-16 bg-gradient-to-tr from-[#1a1a24] to-[#252535] border border-white/10 rounded-2xl flex items-center justify-center shadow-xl transform rotate-3">
              <i className="fa-solid fa-crown text-2xl bg-clip-text text-transparent bg-gradient-to-r from-brand-400 to-indigo-300 -rotate-3"></i>
            </div>
          </div>
          
          <h3 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-4 tracking-tight">
            Limit Reached
          </h3>
          
          <p className="text-gray-400 text-sm mb-8 leading-relaxed px-2">
            You've hit the <span className="text-white font-semibold">two free downloads</span> limit. Upgrade to Pro for unlimited lifetime access to all premium assets and future updates.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => {
                onClose();
                onUpgrade();
              }}
              className="group relative w-full bg-gradient-to-r from-brand-600 to-indigo-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] border border-white/10"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
              <i className="fa-solid fa-bolt text-brand-200 group-hover:animate-bounce"></i>
              <span className="relative z-10 text-[15px]">Upgrade to Pro</span>
            </button>
            <button
              onClick={onClose}
              className="w-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-medium py-3 rounded-xl transition-all text-sm border border-transparent hover:border-white/10"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
