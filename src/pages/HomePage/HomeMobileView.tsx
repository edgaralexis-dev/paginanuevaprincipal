import { Calendar, Home, Search, Ticket, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import ReservaLink from '../../components/ReservaLink/ReservaLink';
import type { CarouselEvent } from '../../services/carousel';
import type { User } from '../../types/user';
import mb from './homeMobile.module.css';

function fmtShort(iso?: string) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'short' }).format(d);
  } catch {
    return iso;
  }
}

export type UpcomingCard = {
  key: string;
  name: string;
  venue: string;
  price: number;
  tag: string;
  cat: string;
  date: string;
  img?: string;
  codigo?: number;
  nombre?: string;
  artista?: string;
  demo?: boolean;
};

type Props = {
  logoSrc: string;
  user: User | null;
  logout: () => void;
  heroSlides: CarouselEvent[] | null;
  heroIdx: number;
  goToSlide: (i: number) => void;
  upcomingCards: UpcomingCard[] | null;
  eventsError: string | null;
};

export default function HomeMobileView({
  logoSrc,
  user,
  logout,
  heroSlides,
  heroIdx,
  goToSlide,
  upcomingCards,
  eventsError,
}: Props) {
  const slide = heroSlides?.[heroIdx];
  const nSlides = heroSlides?.length ?? 0;
  const cards = upcomingCards ?? [];
  const featured = cards.slice(0, 4);

  return (
    <div className={mb.mobileRoot}>
      <nav className={mb.mNav}>
        <Link to="/" className={mb.mLogo}>
          <img src={logoSrc} alt="Primetix" className={mb.mLogoImg} />
        </Link>
        <div className={mb.mNavActions}>
          <div className={mb.mNavIcon} aria-hidden title="Seguro">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 1L3 4v4c0 3 2.5 5.5 5 6 2.5-.5 5-3 5-6V4L8 1z" />
            </svg>
          </div>
          <Link to={user ? '/mis-boletos' : '/login?redirect=/mis-boletos'} className={`${mb.mNavIcon} ${mb.mNavIconWrap}`}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 1C5.2 1 3 3.2 3 6c0 2.5 1 4.5 2 5.5V14l3-2 3 2v-2.5C12 10.5 13 8.5 13 6c0-2.8-2.2-5-5-5z" />
            </svg>
            {user ? <span className={mb.mNavDot} /> : null}
          </Link>
        </div>
      </nav>

      <div className={mb.mSearch}>
        <label className={mb.mSearchBar}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#888" strokeWidth="1.5" aria-hidden>
            <circle cx="6.5" cy="6.5" r="5" />
            <path d="M11 11l3 3" strokeLinecap="round" />
          </svg>
          <input type="search" placeholder="Buscar eventos, artistas…" enterKeyHint="search" autoComplete="off" />
        </label>
      </div>

      {nSlides > 0 && slide ? (
        <div className={mb.mHero}>
          {slide.urlImagen ? (
            <div className={mb.mHeroBg}>
              <img src={slide.urlImagen} alt="" />
            </div>
          ) : (
            <div className={mb.mHeroBg} style={{ background: 'linear-gradient(135deg,#1a1520,#0a0a0a)' }} />
          )}
          <div className={mb.mHeroGrad} />
          {nSlides > 1 ? (
            <div className={mb.mHeroDots}>
              {heroSlides!.map((s, i) => (
                <button
                  key={s.codigo ?? i}
                  type="button"
                  className={`${mb.mDot} ${i === heroIdx ? mb.mDotActive : ''}`}
                  onClick={() => goToSlide(i)}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          ) : null}
          <div className={mb.mHeroContent}>
            <div className={mb.mHeroTag}>
              <span className={mb.mHeroTagDot} />
              {slide.nombreTipo || 'Evento'} · {fmtShort(slide.fechaEvento)}
            </div>
            <div className={mb.mHeroTitle}>{slide.nombreEvento}</div>
            <div className={mb.mHeroMeta}>{slide.ubicacion}</div>
            <div className={mb.mHeroFooter}>
              <div className={mb.mHeroPrice}>
                <span>Desde</span> —
              </div>
              <ReservaLink nombre={slide.nombreEvento} artista={slide.artista} codigo={slide.codigoEvento} className={mb.mHeroBtn}>
                Comprar →
              </ReservaLink>
            </div>
          </div>
        </div>
      ) : (
        <div className={mb.mPlaceholder}>Cargando destacados…</div>
      )}

      {eventsError ? <div className={mb.mPlaceholder}>{eventsError}</div> : null}

      <div className={mb.mSection}>
        <div className={mb.mSectionHeader}>
          <div className={mb.mSectionTitle}>Próximos</div>
          <Link to="/eventos/1/1/1/0" className={mb.mSeeAll}>
            Ver todos →
          </Link>
        </div>
      </div>

      <div className={mb.mCarousel}>
        {cards.map((c) => {
          const inner = (
            <>
              <div className={mb.mEventPhoto}>
                {c.img ? <img src={c.img} alt="" /> : <div style={{ height: '100%', background: '#1a1a1a' }} />}
                <div className={mb.mEventPhotoOverlay} />
                <div className={`${mb.mEventPhotoTag} ${mb.tagNext}`}>{c.tag}</div>
                <div className={mb.mEventPhotoDate}>{fmtShort(c.date)}</div>
              </div>
              <div className={mb.mEventBody}>
                <div className={mb.mEventCat}>{c.cat}</div>
                <div className={mb.mEventName}>{c.name}</div>
                <div className={mb.mEventVenue}>{c.venue}</div>
                <div className={mb.mEventFooter}>
                  <div className={mb.mEventPrice}>
                    <span>Q</span>
                    {c.price > 0 ? c.price : '—'}
                  </div>
                  <span className={mb.mEventArrow}>
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
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
          if (c.demo || typeof c.codigo !== 'number' || !c.nombre || !c.artista) {
            return (
              <div key={c.key} className={mb.mEventCard}>
                {inner}
              </div>
            );
          }
          return (
            <ReservaLink key={c.key} nombre={c.nombre} artista={c.artista} codigo={c.codigo} className={mb.mEventCard}>
              {inner}
            </ReservaLink>
          );
        })}
      </div>

      {featured.length > 0 ? (
        <div className={mb.mFeatured}>
          <div className={mb.mSectionHeader} style={{ marginBottom: 14 }}>
            <div className={mb.mSectionTitle}>Destacados</div>
            <Link to="/eventos/1/1/1/0" className={mb.mSeeAll}>
              Ver todos →
            </Link>
          </div>
          {featured.map((c) => {
            const inner = (
              <>
                <div className={mb.mFeaturedPhoto}>
                  {c.img ? <img src={c.img} alt="" /> : null}
                  <div className={mb.mFeaturedPhotoTitle}>{c.name.toUpperCase().slice(0, 18)}</div>
                </div>
                <div className={mb.mFeaturedInfo}>
                  <div>
                    <div className={mb.mFeaturedCat}>{c.cat}</div>
                    <div className={mb.mFeaturedName}>{c.name}</div>
                    <div className={mb.mFeaturedDate}>
                      {fmtShort(c.date)} · {c.venue}
                    </div>
                  </div>
                  <div className={mb.mFeaturedBottom}>
                    <div className={mb.mFeaturedPrice}>
                      <sup>Q</sup>
                      {c.price > 0 ? c.price : '—'}
                    </div>
                    <div className={mb.mAvail}>
                      <div className={mb.mAvailDot} />
                      <span className={mb.mAvailTxt}>Disponible</span>
                    </div>
                  </div>
                </div>
              </>
            );
            if (c.demo || typeof c.codigo !== 'number' || !c.nombre || !c.artista) {
              return (
                <div key={`f-${c.key}`} className={mb.mFeaturedCard}>
                  {inner}
                </div>
              );
            }
            return (
              <ReservaLink key={`f-${c.key}`} nombre={c.nombre} artista={c.artista} codigo={c.codigo} className={mb.mFeaturedCard}>
                {inner}
              </ReservaLink>
            );
          })}
        </div>
      ) : null}

      <div className={mb.mFooterMini}>© {new Date().getFullYear()} Primetix · Boletos seguros</div>

      <nav className={mb.mTabBar} aria-label="Principal">
        <Link to="/" className={`${mb.mTab} ${mb.mTabActive}`}>
          <span className={mb.mTabIcon}>
            <Home size={20} strokeWidth={1.6} />
          </span>
          <span className={mb.mTabLabel}>Inicio</span>
        </Link>
        <span className={mb.mTab} style={{ opacity: 0.5 }} title="Próximamente">
          <span className={mb.mTabIcon}>
            <Search size={20} strokeWidth={1.6} />
          </span>
          <span className={mb.mTabLabel}>Explorar</span>
        </span>
        <Link to="/eventos/1/1/1/0" className={mb.mTab}>
          <span className={mb.mTabIcon}>
            <Calendar size={20} strokeWidth={1.6} />
          </span>
          <span className={mb.mTabLabel}>Eventos</span>
        </Link>
        <Link to={user ? '/mis-boletos' : '/login?redirect=/mis-boletos'} className={mb.mTab}>
          <span className={`${mb.mTabIcon} ${mb.mTabIconWrap}`}>
            <Ticket size={20} strokeWidth={1.6} />
          </span>
          <span className={mb.mTabLabel}>Mis boletos</span>
        </Link>
        {user ? (
          <button type="button" className={mb.mTab} onClick={() => logout()}>
            <span className={mb.mTabIcon}>
              <UserIcon size={20} strokeWidth={1.6} />
            </span>
            <span className={mb.mTabLabel}>Salir</span>
          </button>
        ) : (
          <Link to="/login?redirect=/" className={mb.mTab}>
            <span className={mb.mTabIcon}>
              <UserIcon size={20} strokeWidth={1.6} />
            </span>
            <span className={mb.mTabLabel}>Cuenta</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
