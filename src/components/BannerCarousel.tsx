"use client";

import React, { useEffect, useState, useRef } from "react";

export interface Banner {
  id: string;
  imageURL: string;
  subtitle?: string;
  title: string;
  description?: string;
  buttonText?: string;
  buttonURL?: string;
  active: boolean;
  order?: number;
}

interface BannerCarouselProps {
  banners: Banner[];
  settings?: {
    autoSlide: boolean;
    slideSpeed: number;
  };
}

export const BannerCarousel: React.FC<BannerCarouselProps> = ({
  banners = [],
  settings = { autoSlide: true, slideSpeed: 5 },
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const activeBanners = banners
    .filter((b) => b.active)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const progressTimerRef = useRef<number | null>(null);
  const [progressWidth, setProgressWidth] = useState(0);

  const speedMs = (settings?.slideSpeed || 5) * 1000;

  useEffect(() => {
    if (activeBanners.length <= 1) return;

    let startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const percent = Math.min((elapsed / speedMs) * 100, 100);
      setProgressWidth(percent);

      if (percent < 100) {
        progressTimerRef.current = requestAnimationFrame(tick);
      } else {
        setCurrentSlide((prev) => (prev + 1) % activeBanners.length);
        setProgressWidth(0);
      }
    };

    if (settings?.autoSlide) {
      progressTimerRef.current = requestAnimationFrame(tick);
    }

    return () => {
      if (progressTimerRef.current) {
        cancelAnimationFrame(progressTimerRef.current);
      }
    };
  }, [currentSlide, activeBanners.length, speedMs, settings?.autoSlide]);

  if (activeBanners.length === 0) {
    return (
      <section className="mb-20 relative group">
        <div className="relative w-full aspect-[21/9] md:aspect-[32/10] rounded-3xl overflow-hidden border border-white/5 bg-dark-800 flex items-center justify-center text-center p-8">
          <div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-2">
              Welcome to Harsh<span className="text-brand-500">Edits</span>
            </h2>
            <p className="text-gray-400">The ultimate resource hub for editors.</p>
          </div>
        </div>
      </section>
    );
  }

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
    setProgressWidth(0);
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % activeBanners.length);
    setProgressWidth(0);
  };

  const handleDotClick = (idx: number) => {
    setCurrentSlide(idx);
    setProgressWidth(0);
  };

  return (
    <section id="banner-carousel-section" className="mb-20 relative group">
      <div className="relative w-full aspect-[21/9] md:aspect-[32/10] rounded-3xl overflow-hidden border border-white/5 bg-dark-800">
        <div
          id="banner-slides"
          className="w-full h-full flex transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {activeBanners.map((banner) => {
            const isEasyWorkflow = banner.buttonURL?.includes("showEasyWorkflowView");
            const btnUrl = isEasyWorkflow ? "#" : banner.buttonURL || "#";

            return (
              <div key={banner.id} className="w-full flex-shrink-0 relative h-full text-left">
                <div className="banner-card-container h-full flex items-center justify-center px-8 md:px-16">
                  <div className="banner-tilt-card w-full max-w-6xl bg-gradient-to-br from-gray-900/95 via-gray-900/90 to-gray-950/95 rounded-[2rem] border border-white/20 shadow-[0_20px_80px_rgba(0,0,0,0.8)] overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>

                    <div className="flex flex-col md:flex-row items-center gap-0 relative z-10">
                      {/* Left: Image */}
                      <div className="w-full md:w-[45%] p-6 md:p-8">
                        <div className="relative rounded-2xl overflow-hidden aspect-video bg-gradient-to-br from-indigo-500/10 to-purple-500/10 ring-1 ring-white/10">
                          <img
                            src={banner.imageURL}
                            className="w-full h-full object-cover"
                            alt={banner.title}
                            loading="lazy"
                          />
                        </div>
                      </div>

                      {/* Right: Content */}
                      <div className="flex-1 p-6 md:p-8 md:pr-12">
                        <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-400/40 text-xs font-bold text-indigo-300 mb-4 uppercase tracking-widest">
                          {banner.subtitle || "Featured"}
                        </span>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight mb-3 tracking-tight">
                          {banner.title}
                        </h2>
                        <p className="text-sm md:text-base text-gray-300 leading-relaxed mb-6 line-clamp-2">
                          {banner.description || ""}
                        </p>
                        {banner.buttonText && banner.buttonURL && (
                          <a
                            href={btnUrl}
                            target={isEasyWorkflow ? undefined : "_blank"}
                            rel={isEasyWorkflow ? undefined : "noopener noreferrer"}
                            className="inline-block mt-6 gradient-btn text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-indigo-500/30 hover:scale-105 transition-transform"
                          >
                            {banner.buttonText}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation Arrows */}
        {activeBanners.length > 1 && (
          <>
            <button
              id="carousel-prev"
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
            >
              <i className="fa-solid fa-chevron-left text-xs"></i>
            </button>
            <button
              id="carousel-next"
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
            >
              <i className="fa-solid fa-chevron-right text-xs"></i>
            </button>
          </>
        )}

        {/* Auto-slide progress bar */}
        {activeBanners.length > 1 && settings?.autoSlide && (
          <div
            id="slide-progress-bar"
            className="absolute bottom-0 left-0 h-[2px] bg-brand-500"
            style={{ width: `${progressWidth}%`, transition: "none" }}
          ></div>
        )}

        {/* Indicator dots */}
        {activeBanners.length > 1 && (
          <div id="carousel-dots" className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {activeBanners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => handleDotClick(idx)}
                className={`transition-all duration-300 rounded-full ${
                  idx === currentSlide
                    ? "bg-white w-6 md:w-8 h-2 md:h-3"
                    : "bg-white/40 hover:bg-white/70 w-2 md:w-3 h-2 md:h-3"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              ></button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
