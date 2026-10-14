import React from 'react';

const SplashScreen = ({ onGetStarted }) => {
  return (
    <div className="fixed top-0 left-0 w-full h-[100dvh] bg-white md:bg-[#f4f6f9] flex justify-center items-center p-0 md:p-3 font-sans box-border overflow-hidden z-[9999]">
      <div className="bg-white w-full max-w-none md:max-w-[380px] h-full max-h-none md:max-h-[850px] rounded-none md:rounded-[28px] shadow-none md:shadow-[0_15px_35px_rgba(0,0,0,0.08)] py-4 px-4 flex flex-col items-center justify-center gap-3 relative box-border overflow-y-auto hide-scrollbar">
        {/* Header Branding */}
        <div className="flex flex-col items-center pt-0 mt-0">
          <img 
            src="/LogoSavitri.png" 
            alt="ShippNex Logo" 
            className="max-w-[120px] h-auto object-contain"
          />
          <div className="flex items-center gap-[5px] mt-[4px]">
            <span className="w-3 h-[2px] bg-slate-400 rounded-sm"></span>
            <span className="text-[11px] font-semibold text-[#1e2b4f] italic tracking-[-0.2px]">The Next Move in Logistics.</span>
            <span className="w-3 h-[2px] bg-slate-400 rounded-sm"></span>
          </div>
        </div>

        {/* Hero Illustration */}
        <div className="w-full flex justify-center items-center py-1 max-h-[160px]">
          <img 
            src="/shopping_cart_illustration.png" 
            alt="Wholesale Shopping Cart" 
            className="w-full max-w-[180px] h-full max-h-[150px] object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.05)]"
          />
        </div>

        {/* Feature Badges */}
        <div className="flex justify-around items-start w-full my-1">
          <div className="flex flex-col items-center flex-1 text-center relative after:content-[''] after:absolute after:right-0 after:top-[15%] after:h-[70%] after:w-px after:bg-slate-100">
            <div className="w-[34px] h-[34px] rounded-full bg-white border border-slate-200 shadow-[0_2px_6px_rgba(0,0,0,0.04)] flex items-center justify-center mb-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#79B433" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            </div>
            <span className="text-[10px] font-bold text-slate-700 leading-[1.1]">Quality<br />Products</span>
          </div>

          <div className="flex flex-col items-center flex-1 text-center relative after:content-[''] after:absolute after:right-0 after:top-[15%] after:h-[70%] after:w-px after:bg-slate-100">
            <div className="w-[34px] h-[34px] rounded-full bg-white border border-slate-200 shadow-[0_2px_6px_rgba(0,0,0,0.04)] flex items-center justify-center mb-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#79B433" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            </div>
            <span className="text-[10px] font-bold text-slate-700 leading-[1.1]">Best<br />Prices</span>
          </div>

          <div className="flex flex-col items-center flex-1 text-center relative">
            <div className="w-[34px] h-[34px] rounded-full bg-white border border-slate-200 shadow-[0_2px_6px_rgba(0,0,0,0.04)] flex items-center justify-center mb-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#79B433" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9"/>
                <polyline points="12 6 12 12 15.5 15.5"/>
              </svg>
            </div>
            <span className="text-[10px] font-bold text-slate-700 leading-[1.1]">On Time<br />Delivery</span>
          </div>
        </div>

        {/* Action Buttons Section */}
        <div className="w-full space-y-2 mt-1">
          <button 
            className="w-full bg-gradient-to-b from-[#79B433] to-[#689A2B] text-white px-4 py-3 rounded-[24px] text-[14px] font-bold shadow-[0_5px_14px_rgba(121,180,51,0.28)] hover:shadow-[0_7px_18px_rgba(121,180,51,0.35)] active:scale-98 transition-all cursor-pointer"
            onClick={onGetStarted}
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
