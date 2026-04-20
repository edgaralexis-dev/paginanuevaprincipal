import { useEffect } from 'react';

type UseCustomCursorOptions = {
  hoverSelectors?: string[];
};

export function useCustomCursor(options: UseCustomCursorOptions = {}) {
  const hoverSelectors = options.hoverSelectors ?? [
    'a',
    'button',
    '.event-card',
    '.cat-pill',
    '.most-viewed-item',
    '.featured-card',
    '.seat',
    '.price-row',
    '.auth-card',
    '.pay-method',
    '.photo-upload-hint',
    '.ticket-card',
  ];

  useEffect(() => {
    const cursor = document.getElementById('cursor');
    const ring = document.getElementById('cursorRing');
    if (!cursor || !ring) return;

    let mx = 0;
    let my = 0;
    let rx = 0;
    let ry = 0;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      cursor.style.left = `${mx}px`;
      cursor.style.top = `${my}px`;
    };

    let raf = 0;
    const animateRing = () => {
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      ring.style.left = `${rx}px`;
      ring.style.top = `${ry}px`;
      raf = window.requestAnimationFrame(animateRing);
    };

    const hoverIn = () => {
      cursor.style.transform = 'translate(-50%,-50%) scale(2.2)';
    };
    const hoverOut = () => {
      cursor.style.transform = 'translate(-50%,-50%) scale(1)';
    };

    document.addEventListener('mousemove', onMove);
    raf = window.requestAnimationFrame(animateRing);

    const selector = hoverSelectors.join(', ');
    const attachHover = (root: ParentNode) => {
      root.querySelectorAll(selector).forEach((el) => {
        el.addEventListener('mouseenter', hoverIn);
        el.addEventListener('mouseleave', hoverOut);
      });
    };
    attachHover(document);

    return () => {
      document.removeEventListener('mousemove', onMove);
      window.cancelAnimationFrame(raf);
      document.querySelectorAll(selector).forEach((el) => {
        el.removeEventListener('mouseenter', hoverIn);
        el.removeEventListener('mouseleave', hoverOut);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

