import { useEffect, useRef, useState } from 'react';

interface BlurTextProps {
  text: string;
  delay?: number;
  className?: string;
  animateBy?: 'words' | 'characters';
  direction?: 'top' | 'bottom';
  threshold?: number;
  rootMargin?: string;
  stepDuration?: number;
}

const BlurText = ({
  text = '',
  delay = 200,
  className = '',
  animateBy = 'words',
  direction = 'top',
  threshold = 0.1,
  rootMargin = '0px',
  stepDuration = 0.35,
}: BlurTextProps) => {
  const elements = animateBy === 'words' ? text.split(' ') : text.split('');
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(ref.current!);
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const directionClass = direction === 'top' ? 'blur-text-top' : 'blur-text-bottom';

  return (
    <div ref={ref} className={`${className} blur-text-container text-center`}>
      <style>{`
        @keyframes blurInTop {
          0% {
            filter: blur(10px);
            opacity: 0;
            transform: translateY(-50px);
          }
          50% {
            filter: blur(5px);
            opacity: 0.5;
            transform: translateY(5px);
          }
          100% {
            filter: blur(0px);
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes blurInBottom {
          0% {
            filter: blur(10px);
            opacity: 0;
            transform: translateY(50px);
          }
          50% {
            filter: blur(5px);
            opacity: 0.5;
            transform: translateY(-5px);
          }
          100% {
            filter: blur(0px);
            opacity: 1;
            transform: translateY(0);
          }
        }

        .blur-text-container {
          display: flex;
          flex-wrap: wrap;
          gap: 0;
          justify-content: center;
        }

        .blur-text-word {
          display: inline-block;
          will-change: transform, filter, opacity;
          margin-right: 0.1em;
        }

        .blur-text-top .blur-text-word {
          animation: blurInTop 1.4s ease-out forwards;
          opacity: 0;
        }

        .blur-text-bottom .blur-text-word {
          animation: blurInBottom 1.4s ease-out forwards;
          opacity: 0;
        }
      `}</style>
      <div className={directionClass}>
        {elements.map((segment, index) => (
          <span
            key={index}
            className="blur-text-word"
            style={{
              animationDelay: `${(index * delay) / 1000}s`,
              animation: inView ? undefined : 'none',
            }}
          >
            {segment === ' ' ? '\u00A0' : segment}
            {animateBy === 'words' && index < elements.length - 1 && '\u00A0'}
          </span>
        ))}
      </div>
    </div>
  );
};

export default BlurText;

