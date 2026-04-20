import { useEffect, useRef, type RefObject } from 'react';

type Options = {
  onDragStart?: () => void;
};

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Element)) return false;
  return Boolean(target.closest('a, button, input, textarea, select, [role="button"]'));
}

/**
 * Permite arrastrar horizontalmente con el ratón (desktop) sobre un contenedor con overflow-x.
 * No interfiere con enlaces ni botones dentro del carrusel.
 */
export function useHorizontalDragScroll(elRef: RefObject<HTMLElement | null>, options?: Options) {
  const onDragStartRef = useRef(options?.onDragStart);
  onDragStartRef.current = options?.onDragStart;

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    let dragging = false;
    let startX = 0;
    let startScroll = 0;

    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (isInteractiveTarget(e.target)) return;
      dragging = true;
      startX = e.pageX;
      startScroll = el.scrollLeft;
      onDragStartRef.current?.();
    };

    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      e.preventDefault();
      el.scrollLeft = startScroll - (e.pageX - startX);
    };

    const onUp = () => {
      dragging = false;
    };

    el.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('blur', onUp);

    return () => {
      el.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('blur', onUp);
    };
  }, [elRef]);
}
