import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCustomCursor } from '../../hooks/useCustomCursor';
import { useHorizontalDragScroll } from '../../hooks/useHorizontalDragScroll';
import ReservaLink from '../../components/ReservaLink/ReservaLink';
import { getCarouselByCountry, type CarouselEvent } from '../../services/carousel';
import {
  flattenEventsSortedByStartDate,
  getEventsByCountryGrouped,
  incrementEventClickCount,
  type ResumeEvent,
} from '../../services/events';
import styles from './home.module.css';
import HomeMobileView from './HomeMobileView';
import WhatsAppIcon from '../../components/icons/WhatsAppIcon';
import logoSrc from '../../assets/LogoPrimetix.svg';

/** Mismo país que carrusel / contexto legacy (Guatemala = 1). Override: `VITE_CODIGO_PAIS`. */
const CODIGO_PAIS_HOME = Number((import.meta.env.VITE_CODIGO_PAIS as string | undefined) ?? '1');

function fmtShortDate(iso?: string) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);
  } catch {
    return iso;
  }
}

/** Sustituir por enlaces oficiales de Primetix cuando estén definidos */
const FOOTER_SOCIAL = {
  instagram: 'https://www.instagram.com/',
  tiktok: 'https://www.tiktok.com/',
  facebook: 'https://www.facebook.com/',
  /** Código país + número sin + ni espacios, ej. 50212345678 */
  whatsapp: 'https://wa.me/50200000000',
} as const;

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={20} height={20} aria-hidden>
      <path
        fill="currentColor"
        d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"
      />
    </svg>
  );
}

export default function HomePage() {
  useCustomCursor();
  const { user, logout } = useAuth();

  const [heroIdx, setHeroIdx] = useState(0);

  const slidesRef = useRef<HTMLDivElement | null>(null);
  const dotsRef = useRef<HTMLDivElement | null>(null);
  const upcomingScrollRef = useRef<HTMLDivElement | null>(null);
  const pauseUpcomingResumeRef = useRef<number | null>(null);
  const upcomingRafRef = useRef<number | null>(null);
  const lastUpcomingTRef = useRef<number | null>(null);

  useEffect(() => {
    const reveals = document.querySelectorAll(`.${styles.reveal}`);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add(styles.visible);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08 },
    );
    reveals.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const [upcomingAutoPaused, setUpcomingAutoPaused] = useState(false);

  const getUpcomingStepPx = useCallback(() => {
    const el = upcomingScrollRef.current;
    if (!el) return 296;
    const first = el.querySelector('[data-upcoming-track]')?.firstElementChild;
    if (!first || !(first instanceof HTMLElement)) return 296;
    return first.offsetWidth + 16;
  }, []);

  const pauseUpcomingAuto = useCallback(() => {
    if (pauseUpcomingResumeRef.current) window.clearTimeout(pauseUpcomingResumeRef.current);
    setUpcomingAutoPaused(true);
    pauseUpcomingResumeRef.current = window.setTimeout(() => {
      setUpcomingAutoPaused(false);
      pauseUpcomingResumeRef.current = null;
    }, 12000);
  }, []);

  const scrollUpcomingBy = useCallback(
    (dir: number) => {
      pauseUpcomingAuto();
      const el = upcomingScrollRef.current;
      if (!el) return;
      el.scrollBy({ left: dir * getUpcomingStepPx(), behavior: 'smooth' });
    },
    [getUpcomingStepPx, pauseUpcomingAuto],
  );

  const [events, setEvents] = useState<ResumeEvent[] | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [carousel, setCarousel] = useState<CarouselEvent[] | null>(null);
  const [carouselError, setCarouselError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [grouped, carData] = await Promise.all([
          getEventsByCountryGrouped(CODIGO_PAIS_HOME),
          getCarouselByCountry(CODIGO_PAIS_HOME),
        ]);
        if (!cancelled) {
          const sorted = flattenEventsSortedByStartDate(grouped).filter((e) => e.codigo !== 78);
          setEvents(sorted);
          setCarousel([...carData].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));
        }
      } catch (e) {
        if (!cancelled) {
          setEvents([]);
          setEventsError('No se pudieron cargar eventos del backend (revisa VITE_URL_API).');
          setCarousel([]);
          setCarouselError('No se pudo cargar el carrusel del backend (revisa VITE_URL_API).');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const upcomingCards = useMemo(() => {
    if (!events) return null;
    // Fallback a demo si backend no trae datos esperados.
    if (events.length === 0) return [];
    return events.slice(0, 12).map((ev) => ({
      key: String(ev.codigo),
      codigo: ev.codigo,
      nombre: ev.nombre,
      artista: ev.artista,
      name: ev.nombre,
      venue: ev.ubicacion,
      price: 0,
      tag: 'Próximo',
      cat: ev.artista,
      date: ev.fechaHoraInicio,
      img: ev.imagenEvento,
    }));
  }, [events]);

  const upcomingRowItems = useMemo(() => {
    if (upcomingCards === null) {
      return [
        { key: 'demo-1', demo: true, tag: 'Esta noche', tagClass: styles.tagLive, date: '26 Mar · Gran Teatro Delirio', cat: 'MMA · Artes marciales', name: 'Knockout Night 7', venue: 'Gran Teatro Delirio · Zona 4', price: 200 },
        { key: 'demo-2', demo: true, tag: 'Próximo', tagClass: styles.tagSoon, date: 'Abr 11–12 · Plaza Cayalá', cat: 'Gastronomía · Festival', name: 'Taco Fest Guatemala 2026', venue: 'Plaza Principal de Cayalá', price: 150 },
        { key: 'demo-3', demo: true, tag: '29 May', tagClass: styles.tagSoon, date: '29 May · Gran Teatro Delirio', cat: 'R&B · Soul', name: 'Shé Gira 20 Aniversario', venue: 'Gran Teatro Delirio', price: 350 },
        { key: 'demo-4', demo: true, tag: '5 Jul', tagClass: styles.tagSoon, date: '5 Jul · Zona 4', cat: 'Rap · Hip-Hop', name: 'Chystemc en Guatemala', venue: 'Parqueo vía 3 3-43, Zona 4', price: 275 },
        { key: 'demo-5', demo: true, tag: '10 May', tagClass: styles.tagSoon, date: '10 May · Guatemala', cat: 'Música · Especial', name: 'Serenatas para Mamá', venue: 'Por confirmar', price: 120 },
        { key: 'demo-6', demo: true, tag: '19 Jul', tagClass: styles.tagSoon, date: '19 Jul · Explanada 5', cat: 'Bachata · Latino', name: 'Romeo Santos', venue: 'Explanada 5, Guatemala City', price: 550 },
      ];
    }
    if (upcomingCards.length === 0) return [];
    return upcomingCards;
  }, [upcomingCards]);

  useEffect(() => {
    if (upcomingAutoPaused || upcomingRowItems.length === 0) {
      if (upcomingRafRef.current) cancelAnimationFrame(upcomingRafRef.current);
      upcomingRafRef.current = null;
      lastUpcomingTRef.current = null;
      return;
    }

    const speedPxPerSec = 22;

    const loop = (t: number) => {
      if (upcomingAutoPaused) return;
      const node = upcomingScrollRef.current;
      if (!node) {
        upcomingRafRef.current = requestAnimationFrame(loop);
        return;
      }

      const last = lastUpcomingTRef.current ?? t;
      const dt = Math.min(32, t - last) / 1000;
      lastUpcomingTRef.current = t;

      const half = node.scrollWidth / 2;
      if (half < 2) {
        upcomingRafRef.current = requestAnimationFrame(loop);
        return;
      }

      node.scrollLeft += speedPxPerSec * dt;
      if (node.scrollLeft >= half - 1) {
        node.scrollLeft -= half;
      }

      upcomingRafRef.current = requestAnimationFrame(loop);
    };

    lastUpcomingTRef.current = null;
    upcomingRafRef.current = requestAnimationFrame(loop);
    return () => {
      if (upcomingRafRef.current) cancelAnimationFrame(upcomingRafRef.current);
      upcomingRafRef.current = null;
      lastUpcomingTRef.current = null;
    };
  }, [upcomingAutoPaused, upcomingRowItems]);

  useEffect(
    () => () => {
      if (pauseUpcomingResumeRef.current) window.clearTimeout(pauseUpcomingResumeRef.current);
    },
    [],
  );

  const heroSlides = useMemo(() => {
    if (!carousel) return null;
    const list = carousel.slice(0, 3);
    if (list.length === 0) return [];
    return list;
  }, [carousel]);

  const slideCount = heroSlides?.length ?? 0;

  useEffect(() => {
    if (slidesRef.current) {
      slidesRef.current.style.transform = `translateX(-${heroIdx * 100}%)`;
    }
    if (dotsRef.current) {
      dotsRef.current.querySelectorAll(`.${styles.heroDot}`).forEach((d, i) => {
        d.classList.toggle(styles.active, i === heroIdx);
      });
    }
  }, [heroIdx]);

  const goToSlide = (idx: number) => {
    const n = heroSlides?.length ?? 0;
    if (n === 0) return;
    setHeroIdx(((idx % n) + n) % n);
  };
  const heroSlide = (dir: number) => {
    const n = heroSlides?.length ?? 0;
    if (n === 0) return;
    setHeroIdx((p) => (p + dir + n) % n);
  };

  useEffect(() => {
    if (slideCount > 0 && heroIdx >= slideCount) setHeroIdx(0);
  }, [slideCount, heroIdx]);

  useEffect(() => {
    if (slideCount <= 1) return;
    const t = window.setInterval(() => {
      setHeroIdx((p) => (p + 1) % slideCount);
    }, 3000);
    return () => window.clearInterval(t);
  }, [slideCount]);

  useHorizontalDragScroll(upcomingScrollRef, { onDragStart: pauseUpcomingAuto });

  return (
    <>
    <div className={`${styles.root} ${styles.desktopOnly}`}>
      <div className={styles.cursor} id="cursor" />
      <div className={styles.cursorRing} id="cursorRing" />

      <nav className={styles.nav}>
        <Link to="/" className={styles.logo}>
          <img src={logoSrc} alt="Primetix" style={{ height: 28, width: 'auto', display: 'block' }} />
        </Link>

        <div className={styles.navSearch}>
          <svg
            className={styles.navSearchIcon}
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="6.5" cy="6.5" r="5" />
            <path d="M11 11l3 3" strokeLinecap="round" />
          </svg>
          <input type="text" placeholder="Buscar eventos, artistas, lugares..." />
        </div>

        <div className={styles.navRight}>
          {user ? (
            <>
              <span className={styles.navUserName} title={user.nombre}>
                {user.nombre.split(/\s+/)[0]}
              </span>
              <button type="button" className={styles.navLogout} onClick={() => logout()}>
                Salir
              </button>
            </>
          ) : (
            <Link to="/login?redirect=/" className={styles.navLogin}>
              Iniciar sesión
            </Link>
          )}

          <Link to={user ? '/mis-boletos' : '/login?redirect=/mis-boletos'} className={styles.navBtn}>
            Mis boletos
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="4" width="12" height="10" rx="1.5" />
              <path d="M5 4V3a3 3 0 016 0v1" />
            </svg>
          </Link>
        </div>
      </nav>

      <div className={styles.ticker}>
        <div className={styles.tickerTrack}>
          {[
            'Conciertos',
            'Festivales',
            'Deportes',
            'Teatro',
            'Gastronomía',
            'Arte y Cultura',
            'Boletos seguros',
            'Transferibles',
            'QR Dinámico',
            'Guatemala · El Salvador · Honduras',
            'Conciertos',
            'Festivales',
            'Deportes',
            'Teatro',
            'Gastronomía',
            'Arte y Cultura',
            'Boletos seguros',
            'Transferibles',
            'QR Dinámico',
            'Guatemala · El Salvador · Honduras',
          ].map((t, i) => (
            <span className={styles.tickerItem} key={`${t}-${i}`}>
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.hero}>
        <div className={styles.heroSlides} ref={slidesRef}>
          {(heroSlides ?? []).length > 0
            ? (heroSlides ?? []).map((s) => (
                <div className={styles.heroSlide} key={s.codigo}>
                  <div className={styles.heroSlideBgPlaceholder}>
                    {s.urlImagen ? <img className={styles.heroSlideBg} src={s.urlImagen} alt={s.nombreEvento} /> : null}
                  </div>
                  <div className={styles.heroGrad} />
                  <div className={styles.heroContent}>
                    <div className={styles.heroTag}>
                      <span className={styles.heroTagDot} />
                      {s.nombreTipo} · {s.ubicacion}
                    </div>
                    <div className={styles.heroTitle}>{s.nombreEvento}</div>
                    <div className={styles.heroMeta}>
                      <div className={styles.heroMetaItem}>
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
                          <rect x="2" y="3" width="12" height="11" rx="1" />
                          <path d="M5 1v4M11 1v4M2 7h12" />
                        </svg>
                        {s.fechaEvento}
                      </div>
                      <div className={styles.heroMetaItem}>
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
                          <path d="M8 1C5.2 1 3 3.2 3 6c0 3.7 5 9 5 9s5-5.3 5-9c0-2.8-2.2-5-5-5z" />
                          <circle cx="8" cy="6" r="1.5" />
                        </svg>
                        {s.ubicacion}
                      </div>
                    </div>
                    <div className={styles.heroActions}>
                      <ReservaLink nombre={s.nombreEvento} artista={s.artista} codigo={s.codigoEvento} className={styles.btnPrimary}>
                        Comprar boletos
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M3 8h10M9 4l4 4-4 4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </ReservaLink>
                      <a
                        href="#"
                        className={styles.btnGhostSm}
                        role="button"
                        onClick={() => {
                          void incrementEventClickCount(s.codigoEvento);
                          // TODO: reemplazar por página interna de detalle cuando esté completa
                        }}
                      >
                        Más información
                      </a>
                    </div>
                  </div>
                </div>
              ))
            : null}
        </div>

        <button type="button" className={`${styles.heroArrow} ${styles.prev}`} onClick={() => heroSlide(-1)} aria-label="Anterior">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button type="button" className={`${styles.heroArrow} ${styles.next}`} onClick={() => heroSlide(1)} aria-label="Siguiente">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className={styles.heroDots} ref={dotsRef}>
          {Array.from({ length: Math.max(slideCount, 0) }).map((_, i) => (
            <div key={i} className={`${styles.heroDot} ${i === heroIdx ? styles.active : ''}`} onClick={() => goToSlide(i)} />
          ))}
        </div>
      </div>

      <div className={`${styles.section} ${styles.reveal}`}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionLabel}>Esta semana y próximamente</div>
            <div className={styles.sectionTitle}>Próximos Eventos</div>
          </div>
          <Link to="/eventos/1/1/1/0" className={styles.seeAll}>
            Ver todos →
          </Link>
        </div>

        {eventsError || carouselError ? (
          <div style={{ marginBottom: 12, color: 'var(--muted2)', fontSize: 12 }}>{eventsError}</div>
        ) : null}

        <div className={styles.carouselWrap}>
          <div
            className={styles.carouselTrackOuter}
            ref={upcomingScrollRef}
            onPointerDown={pauseUpcomingAuto}
            onWheel={pauseUpcomingAuto}
          >
            <div className={styles.carouselTrack} data-upcoming-track>
              {(['a', 'b'] as const).flatMap((suffix) =>
                upcomingRowItems.map((c: any) => {
                  const key = `${suffix}-${c.key ?? c.name}`;
                  const isDemo = c.demo === true;
                  const dateLabel = isDemo ? c.date || '—' : fmtShortDate(c.date);
                  const cardInner = (
                    <>
                      <div className={styles.eventCardPhoto}>
                        {c.img ? (
                          <>
                            <img src={c.img} alt={c.name} loading="lazy" decoding="async" />
                            <div className={styles.eventCardOverlay} />
                          </>
                        ) : (
                          <div className={styles.eventCardPhotoPlaceholder}>
                            <div className={styles.eventCardPhotoGrad} style={{ background: 'linear-gradient(135deg,#1a0505,#050510)' }} />
                            <div className={styles.eventCardPhotoTitle}>{c.name.toUpperCase()}</div>
                          </div>
                        )}
                        <div className={`${styles.eventCardPhotoTag} ${c.tagClass ?? styles.tagSoon}`}>{c.tag}</div>
                        <div className={styles.eventCardDateBadge}>{dateLabel}</div>
                      </div>
                      <div className={styles.eventCardBody}>
                        <div className={styles.eventCardCategory}>{c.cat}</div>
                        <div className={styles.eventCardName}>{c.name}</div>
                        <div className={styles.eventCardVenue}>{c.venue}</div>
                        <div className={styles.eventCardFooter}>
                          <div>
                            <div className={styles.eventCardPriceFrom}>Desde</div>
                            <div className={styles.eventCardPrice}>
                              <span>Q</span>
                              {c.price}
                            </div>
                          </div>
                          <span className={styles.eventCardBuy} aria-hidden>
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                              <path
                                d="M3 8h10M9 4l4 4-4 4"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                        </div>
                      </div>
                    </>
                  );
                  if (isDemo || typeof c.codigo !== 'number') {
                    return (
                      <div key={key} className={styles.eventCard}>
                        {cardInner}
                      </div>
                    );
                  }
                  return (
                    <ReservaLink
                      key={key}
                      nombre={c.nombre}
                      artista={c.artista}
                      codigo={c.codigo}
                      className={styles.eventCard}
                    >
                      {cardInner}
                    </ReservaLink>
                  );
                }),
              )}
            </div>
          </div>

          <button
            className={`${styles.carouselBtn} ${styles.prev}`}
            type="button"
            onClick={() => scrollUpcomingBy(-1)}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            className={`${styles.carouselBtn} ${styles.next}`}
            type="button"
            onClick={() => scrollUpcomingBy(1)}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <footer className={styles.footer}>
        <div>
          <div className={styles.footerLogo}>
            <Link to="/" className={styles.footerBrand} aria-label="Primetix">
              <img src={logoSrc} alt="Primetix" className={styles.footerLogoImg} />
            </Link>
          </div>
          <div className={styles.footerTagline}>
            La forma más fácil de disfrutar tus eventos favoritos en Latinoamérica. Boletos seguros, transferibles y con QR dinámico.
          </div>
          <div className={styles.footerFollow}>
            <span className={styles.footerFollowLabel}>Síguenos</span>
            <div className={styles.footerSocialInline} aria-label="Redes sociales">
            <a
              href={FOOTER_SOCIAL.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialBtn}
              aria-label="Instagram"
            >
              <Instagram size={18} strokeWidth={1.6} />
            </a>
            <a
              href={FOOTER_SOCIAL.tiktok}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialBtn}
              aria-label="TikTok"
            >
              <TikTokIcon className={styles.socialGlyph} />
            </a>
            <a
              href={FOOTER_SOCIAL.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialBtn}
              aria-label="Facebook"
            >
              <Facebook size={18} strokeWidth={1.6} />
            </a>
            <a
              href={FOOTER_SOCIAL.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialBtn}
              aria-label="WhatsApp"
            >
              <WhatsAppIcon size={18} />
            </a>
            </div>
          </div>
        </div>
        <div>
          <div className={styles.footerColTitle}>Eventos</div>
          <ul className={styles.footerLinks}>
            <li>
              <a href="#">Conciertos</a>
            </li>
            <li>
              <a href="#">Festivales</a>
            </li>
            <li>
              <a href="#">Teatro y cultura</a>
            </li>
            <li>
              <a href="#">Deportes</a>
            </li>
            <li>
              <a href="#">Gastronomía</a>
            </li>
          </ul>
        </div>
        <div>
          <div className={styles.footerColTitle}>Primetix</div>
          <ul className={styles.footerLinks}>
            <li>
              <a href="#">Quiénes somos</a>
            </li>
            <li>
              <a href="#">Para organizadores</a>
            </li>
            <li>
              <a href="#">Billetera digital</a>
            </li>
            <li>
              <a href="#">Blog</a>
            </li>
            <li>
              <Link to="/contactanos" className={styles.footerTextLink}>
                Contáctanos
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <div className={styles.footerColTitle}>Legal</div>
          <ul className={styles.footerLinks}>
            <li>
              <a href="#">Términos de uso</a>
            </li>
            <li>
              <a href="#">Privacidad</a>
            </li>
            <li>
              <a href="#">Política de reembolso</a>
            </li>
            <li>
              <Link to="/FAQs/general">Preguntas frecuentes</Link>
            </li>
          </ul>
        </div>
        <div className={styles.footerBottom}>
          <div className={styles.footerCopy}>
            © 2026 Primetix. Todos los derechos reservados. Guatemala · El Salvador · Honduras · Costa Rica · Panamá
          </div>
        </div>
      </footer>
    </div>

    <div className={styles.mobileOnly}>
      <HomeMobileView
        logoSrc={logoSrc}
        user={user}
        logout={logout}
        heroSlides={heroSlides}
        heroIdx={heroIdx}
        goToSlide={goToSlide}
        upcomingCards={upcomingCards}
        eventsError={eventsError ?? carouselError}
      />
    </div>
    </>
  );
}

