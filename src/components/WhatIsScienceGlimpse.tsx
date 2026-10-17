import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';

type Props = {
  showVideo?: boolean;
  showButton?: boolean;
  centerText?: boolean;
  paragraphSize?: 'normal' | 'large' | 'lg';
  overrideParagraphs?: string[];
};

const WhatIsScienceGlimpse: React.FC<Props> = ({
  showVideo = true,
  showButton = true,
  centerText = false,
  paragraphSize = 'normal',
  overrideParagraphs
}) => {
  const navigate = useNavigate();

  return (
    <section className="relative py-20 md:py-24 overflow-hidden text-gray-100">

      {/* Transparent backdrop (lets animated background show through) */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-12 px-6">
        <div className="flex-1 text-left">
          <h1 className={`${centerText ? 'text-center' : ''} text-4xl md:text-5xl font-extrabold mb-4`}>
            WHAT IS{' '}
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(168,85,247,0.7)]">
              SCIENCEGLIMPSE?
            </span>
          </h1>

          <h2 className={`${centerText ? 'text-center' : ''} text-xl md:text-2xl text-blue-300 font-semibold mb-8`}>
            By Students, For Everyone
          </h2>

          {overrideParagraphs ? (
            <div className={`${centerText ? 'max-w-4xl mx-auto' : ''} mt-6`}>
              {overrideParagraphs.map((p, i) => (
                <p
                  key={i}
                  className={`${centerText ? 'text-center' : ''} ${
                    paragraphSize === 'large'
                      ? 'text-xl md:text-2xl'
                      : paragraphSize === 'lg'
                        ? 'text-lg md:text-xl'
                        : 'text-lg'
                  } leading-relaxed text-gray-200 ${i === 0 ? '' : 'mt-4'}`}
                >
                  {p}
                </p>
              ))}
            </div>
          ) : (
            <p
              className={`${centerText ? 'text-center max-w-4xl mx-auto' : ''} ${
                paragraphSize === 'large'
                  ? 'text-xl md:text-2xl'
                  : paragraphSize === 'lg'
                    ? 'text-lg md:text-xl'
                    : 'text-lg'
              } leading-relaxed text-gray-200 mt-6`}
            >
              <b>ScienceGlimpse</b> is a student-led exploration site designed for anyone
              interested in learning more about a scientific topic or writing a
              science article. Our mission is to do the opposite of what every
              other scientific article does by providing a concise 5-minute
              article that conveys the main information, current applications in
              the scientific community, and the key breakthroughs we have observed. By
              uniting the voices of passionate students across the world, we aim to
              present unique and diverse scientific perspectives for readers of all
              experience and interest levels — all in an engaging and meaningful way.
            </p>
          )}

          {showButton && (
            <div className={`${centerText ? 'text-center' : 'text-left'} mt-12`}>
              <Button
                variant="outline"
                size="lg"
                className="
                  glow-action-btn-green
                  text-black dark:text-white
                  text-lg py-4 transition-all duration-300
                "
                onClick={() => navigate('/about')}
              >
                Learn More
              </Button>
            </div>
          )}
        </div>

        {showVideo && (
          <div className="flex-1 flex justify-center">
            <div className="w-80 h-[450px] rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(147,51,234,0.5)] border-4 border-purple-500/70">
              {/* YouTube refuses to play an embed that arrives without a referrer
                  ("Video player configuration error"), so pin the policy here
                  rather than relying on whatever the page or host sets. */}
              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/GhQPjrM0t2Y"
                title="ScienceGlimpse Shorts"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        )}
      </div>

      <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-purple-500/10 to-transparent animate-pulse pointer-events-none" />
    </section>
  );
};

export default WhatIsScienceGlimpse;