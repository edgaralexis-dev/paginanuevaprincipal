import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Download, Facebook, LogOut, Search, Shield, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  cancelResale,
  cancelTransfer,
  filterPastTickets,
  filterUpcomingTickets,
  getTicketHistoryByUser,
  getTicketTimeline,
  getTicketsByUser,
  type ResumeTicketHistorial,
  type TicketTimelineItem,
} from '../../services/tickets';
import type { TicketEventos, TicketTix } from '../../types/tickets';
import { primetixWebHref } from '../../utils/reservaUrl';
import logoSrc from '../../assets/LogoPrimetix.svg';
import styles from './misBoletos.module.css';

function IosShareGlyph() {
  // Visual parity with Material `IosShareIcon` used in paginaprincipal.
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 15V4.5M12 4.5L8.5 8M12 4.5L15.5 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 10.5V18.5C6 19.0523 6.44772 19.5 7 19.5H17C17.5523 19.5 18 19.0523 18 18.5V10.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WhatsAppGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12.04 3C7.06 3 3.02 6.98 3.02 11.9C3.02 13.67 3.55 15.32 4.46 16.72L3 21L7.45 19.58C8.78 20.3 10.31 20.71 11.94 20.71H12.04C17.02 20.71 21.06 16.73 21.06 11.81C21.06 6.89 17.02 3 12.04 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 9.44C8.72 8.95 8.96 8.94 9.18 8.94C9.35 8.94 9.55 8.94 9.73 8.94C9.92 8.94 10.17 8.87 10.39 9.39C10.62 9.92 11.17 11.24 11.24 11.36C11.31 11.48 11.36 11.63 11.24 11.82C11.13 12.01 11.07 12.13 10.94 12.27C10.82 12.41 10.69 12.58 10.58 12.69C10.46 12.81 10.34 12.95 10.51 13.24C10.67 13.53 11.25 14.47 12.1 15.23C13.19 16.2 14.1 16.5 14.42 16.63C14.74 16.77 14.92 16.74 15.06 16.58C15.2 16.42 15.64 15.91 15.8 15.67C15.97 15.42 16.13 15.46 16.35 15.54C16.57 15.62 17.72 16.17 17.96 16.29C18.2 16.41 18.36 16.47 18.42 16.57C18.48 16.67 18.48 17.17 18.26 17.6C18.04 18.03 16.97 18.45 16.53 18.52C16.09 18.58 15.54 18.61 14.02 18C12.5 17.39 11.52 16.72 10.55 15.76C9.58 14.79 8.8 13.54 8.42 12.3C8.04 11.05 8.28 9.93 8.5 9.44Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 7L17 17M17 7L7 17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('es-GT', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return iso;
  }
}

export default function MisBoletosPage() {
  const { user, logout } = useAuth();
  const [allEvents, setAllEvents] = useState<TicketEventos[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tickets' | 'pasados' | 'transferencias' | 'historial' | 'perfil'>('tickets');
  const [transferStep, setTransferStep] = useState<1 | 2 | 3>(1);
  const [settingsSection, setSettingsSection] = useState<'info' | 'notif' | 'security'>('info');
  const [busyTicket, setBusyTicket] = useState<number | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [timelineTicket, setTimelineTicket] = useState<number | null>(null);
  const [timelineItems, setTimelineItems] = useState<TicketTimelineItem[]>([]);
  const [historyItems, setHistoryItems] = useState<ResumeTicketHistorial[]>([]);
  const [notifPrefs, setNotifPrefs] = useState({
    reminder: true,
    transfers: true,
    newEvents: false,
    offers: true,
    marketing: false,
  });
  const [timelineEventInfo, setTimelineEventInfo] = useState<{
    eventName: string;
    artist: string;
    image: string;
    locality: string;
    seat: string;
  } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareData, setShareData] = useState<{
    eventCode: number;
    ticketCode: number;
    seatCode: number;
    eventName: string;
    artist: string;
    eventDate: string;
    image: string;
    locality: string;
  } | null>(null);

  const loadTickets = async () => {
    if (!user?.codigo || !user?.tokenPrivado) return;
    const raw = await getTicketsByUser(user.codigo, user.tokenPrivado);
    if ('response' in raw && raw.response === 'SinJWT') {
      logout();
      return;
    }
    const parsed = raw as import('../../types/tickets').ResumeTickets;
    setAllEvents(Array.isArray(parsed.eventos) ? parsed.eventos : []);
  };

  useEffect(() => {
    if (!user?.codigo || !user?.tokenPrivado) return;
    let cancelled = false;
    (async () => {
      try {
        const [raw, historyRaw] = await Promise.all([
          getTicketsByUser(user.codigo, user.tokenPrivado),
          getTicketHistoryByUser(user.codigo, user.tokenPrivado),
        ]);
        if (cancelled) return;
        if ('response' in raw && raw.response === 'SinJWT') {
          logout();
          return;
        }
        if ('response' in historyRaw && historyRaw.response === 'SinJWT') {
          logout();
          return;
        }
        const parsed = raw as import('../../types/tickets').ResumeTickets;
        setAllEvents(Array.isArray(parsed.eventos) ? parsed.eventos : []);
        setHistoryItems(Array.isArray(historyRaw) ? historyRaw : []);
      } catch {
        if (!cancelled) setError('No se pudieron cargar tus boletos.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.codigo, user?.tokenPrivado, logout]);

  const historyRows = useMemo(() => {
    const ticketLookup = new Map<
      number,
      { evento: string; fechaEvento: string; imagenEvento: string; precio: number; estadoTicket: string }
    >();
    for (const ev of allEvents ?? []) {
      for (const t of ev.tickets ?? []) {
        ticketLookup.set(t.codigo, {
          evento: ev.evento,
          fechaEvento: ev.fechaEvento,
          imagenEvento: ev.imagenEvento,
          precio: Number(t.precio ?? 0),
          estadoTicket: t.estado,
        });
      }
    }

    const grouped = new Map<
      string,
      {
        evento: string;
        fechaCompra: string;
        fechaEvento: string;
        imagenEvento: string;
        boletos: number;
        total: number;
        estado: string;
      }
    >();

    for (const h of historyItems) {
      const t = ticketLookup.get(h.codigoTicket);
      const evento = t?.evento || `Ticket #${h.codigoTicket}`;
      const fechaCompra = h.fecha || '';
      const fechaEvento = t?.fechaEvento || h.fecha || '';
      const imagenEvento = t?.imagenEvento || '';
      const estado = h.estado || t?.estadoTicket || 'TA';
      const key = `${evento}|${new Date(fechaCompra).toDateString()}|${estado}`;
      const cur = grouped.get(key);
      if (cur) {
        cur.boletos += 1;
        cur.total += Number(t?.precio ?? 0);
      } else {
        grouped.set(key, {
          evento,
          fechaCompra,
          fechaEvento,
          imagenEvento,
          boletos: 1,
          total: Number(t?.precio ?? 0),
          estado,
        });
      }
    }

    return [...grouped.values()].sort(
      (a, b) => new Date(b.fechaCompra || 0).getTime() - new Date(a.fechaCompra || 0).getTime(),
    );
  }, [allEvents, historyItems]);

  const upcomingEvents = useMemo(() => {
    if (!allEvents) return null;
    return filterUpcomingTickets({ eventos: allEvents });
  }, [allEvents]);

  const pastEvents = useMemo(() => {
    if (!allEvents) return null;
    return filterPastTickets({ eventos: allEvents });
  }, [allEvents]);

  const totalTickets = useMemo(
    () => (upcomingEvents ?? []).reduce((acc, ev) => acc + ev.tickets.length, 0),
    [upcomingEvents],
  );
  const initials = useMemo(() => {
    const raw = (user?.nombre || 'U').trim();
    const parts = raw.split(/\s+/).filter(Boolean);
    return (parts[0]?.[0] || 'U') + (parts[1]?.[0] || '');
  }, [user?.nombre]);

  const statusVisual = (estado?: string) => {
    const v = (estado || '').toLowerCase();
    if (v.includes('inactivo') || v.includes('escane') || v === 'ti') {
      return { pill: 'INACTIVE', title: 'Ticket Ya Escaneado', subtitle: 'Ticket utilizado exitosamente' };
    }
    if (v.includes('transfer') || v === 'tt') {
      return { pill: 'TRANSFER', title: 'Ticket En Transferencia', subtitle: 'Pendiente de aceptación' };
    }
    return { pill: 'ACTIVE', title: 'Ticket Activo', subtitle: 'Codigo QR listo para ingreso' };
  };

  const renderTicketCard = (ev: TicketEventos, t: TicketTix, forcedEstado?: string) => {
    const s = statusVisual(forcedEstado ?? t.estado);
    const rawState = (forcedEstado ?? t.estado ?? '').toLowerCase();
    const canTransfer = rawState === 'ta' || rawState.includes('activo');
    const isTransferred = rawState === 'tt' || rawState.includes('transfer');
    const isResale = rawState === 'tr' || rawState.includes('reventa');

    const openShareModal = () => {
      setShareData({
        eventCode: ev.codigoEvento,
        ticketCode: t.codigo,
        seatCode: t.codigoAsiento,
        eventName: ev.evento,
        artist: ev.artista,
        eventDate: ev.fechaEvento,
        image: ev.imagenEvento,
        locality: t.localidad,
      });
      setShareOpen(true);
    };

    return (
      <article className={styles.ticketCard} key={t.codigo}>
        <div className={styles.ticketTop}>
          {ev.imagenEvento ? <img className={styles.ticketTopImg} src={ev.imagenEvento} alt="" /> : <div className={styles.ticketTopImg} />}
          <div className={styles.ticketTopOverlay} />
          <div className={styles.ticketCode}>Ticket-{t.codigo}</div>
          <div className={styles.ticketTopActions}>
            <button
              type="button"
              className={styles.topIconBtn}
              title="Historial del ticket"
              onClick={async () => {
                if (!user?.codigo || !user?.tokenPrivado) return;
                setTimelineOpen(true);
                setTimelineLoading(true);
                setTimelineError(null);
                setTimelineTicket(t.codigo);
                setTimelineEventInfo({
                  eventName: ev.evento,
                  artist: ev.artista,
                  image: ev.imagenEvento,
                  locality: t.localidad,
                  seat: t.asiento,
                });
                try {
                  const resp = await getTicketTimeline(user.codigo, t.codigo, user.tokenPrivado);
                  if ('response' in resp) {
                    if (resp.response === 'SinJWT') {
                      logout();
                      return;
                    }
                    setTimelineItems([]);
                    setTimelineError(`No se pudo cargar historial (${resp.response}).`);
                    return;
                  }
                  setTimelineItems(resp);
                } catch {
                  setTimelineError('No se pudo cargar el historial del ticket.');
                  setTimelineItems([]);
                } finally {
                  setTimelineLoading(false);
                }
              }}
            >
              <Search size={16} />
            </button>
            <button
              type="button"
              className={styles.topIconBtn}
              title="Compartir ticket"
              onClick={openShareModal}
            >
              <IosShareGlyph />
            </button>
          </div>
        </div>

        <div className={styles.ticketStatePill}>{s.pill}</div>

        <div className={styles.ticketCenter}>
          <div className={styles.ticketCheck}>✓</div>
          <div className={styles.ticketCenterTitle}>{s.title}</div>
          <div className={styles.ticketCenterSub}>{s.subtitle}</div>
        </div>

        <div className={styles.ticketBottom}>
          <span className={styles.ticketBottomDot}>●</span>
          <span>{s.pill === 'ACTIVE' ? 'Codigo QR Disponible' : 'Codigo QR No Disponible'}</span>
        </div>

        <div className={styles.ticketMetaFooter}>
          <div className={styles.ticketLocal}>{t.localidad}</div>
          <div className={styles.ticketPrice}>{t.precio != null ? `Q ${Number(t.precio).toLocaleString('es-GT')}` : '—'}</div>
        </div>

        <Link to={`/ticketqr/${ev.codigoEvento}/${t.codigo}/${t.codigoAsiento}`} className={styles.qrOpen}>
          Abrir ticket
        </Link>

        <div className={styles.ticketActions}>
          <button
            type="button"
            className={styles.utilBtn}
            onClick={openShareModal}
            title="Copiar enlace"
          >
            Compartir
          </button>
          <button type="button" className={styles.utilBtn} title="Historial">
            Historial
          </button>
        </div>

        <div className={styles.ticketActionRow}>
          {canTransfer ? (
            <a className={styles.actionBtnGhost} href={primetixWebHref(`/transferencia/${ev.codigoEvento}/${t.codigo}`)}>
              Transferir
            </a>
          ) : null}
          {canTransfer ? (
            <a className={styles.actionBtnGhost} href={primetixWebHref(`/VentaTickets/${ev.codigoEvento}/${t.codigo}`)}>
              Vender
            </a>
          ) : null}
          {isTransferred ? (
            <button
              type="button"
              className={styles.actionBtnGhost}
              disabled={busyTicket === t.codigo}
              onClick={async () => {
                if (!user?.tokenPrivado || !user?.codigo) return;
                setBusyTicket(t.codigo);
                try {
                  const resp = await cancelTransfer(t.codigo, user.codigo, user.tokenPrivado);
                  if (resp.response === 'SinJWT') {
                    logout();
                    return;
                  }
                  await loadTickets();
                } finally {
                  setBusyTicket(null);
                }
              }}
            >
              {busyTicket === t.codigo ? 'Cancelando...' : 'Cancelar'}
            </button>
          ) : null}
          {isResale ? (
            <button
              type="button"
              className={styles.actionBtnGhost}
              disabled={busyTicket === t.codigo}
              onClick={async () => {
                if (!user?.tokenPrivado) return;
                setBusyTicket(t.codigo);
                try {
                  const resp = await cancelResale(t.codigo, user.tokenPrivado);
                  if (resp.response === 'SinJWT') {
                    logout();
                    return;
                  }
                  await loadTickets();
                } finally {
                  setBusyTicket(null);
                }
              }}
            >
              {busyTicket === t.codigo ? 'Cancelando...' : 'Cancelar'}
            </button>
          ) : null}
          <Link to={`/ticketqr/${ev.codigoEvento}/${t.codigo}/${t.codigoAsiento}`} className={styles.actionBtnPrimary}>
            Ver ticket
          </Link>
        </div>
      </article>
    );
  };

  return (
    <div className={styles.page}>
      <header className={styles.topNav}>
        <Link to="/" className={styles.logo}>
          <img src={logoSrc} alt="Primetix" className={styles.logoImg} />
        </Link>
        <div className={styles.navMainLinks}>
          <Link to="/">Eventos</Link>
          <button type="button">Conciertos</button>
          <button type="button">Festivales</button>
        </div>
        <div className={styles.navRight}>
          <div className={styles.userGreeting}>
            Hola, <strong>{user?.nombre || 'Usuario'}</strong>
          </div>
          <button type="button" className={styles.iconBtn} onClick={() => setActiveTab('perfil')} title="Perfil">
            ⚙
          </button>
          <button type="button" className={styles.avatar} onClick={() => setActiveTab('perfil')} title="Perfil">
            {initials.toUpperCase()}
          </button>
          <button type="button" className={styles.btnOutline} onClick={() => logout()}>
            Salir
          </button>
        </div>
      </header>

      <div className={styles.tabsNav}>
        <button type="button" className={`${styles.tabBtn} ${activeTab === 'tickets' ? styles.active : ''}`} onClick={() => setActiveTab('tickets')}>
          Mis tickets <span className={styles.tabCount}>{totalTickets}</span>
        </button>
        <button type="button" className={`${styles.tabBtn} ${activeTab === 'pasados' ? styles.active : ''}`} onClick={() => setActiveTab('pasados')}>
          Eventos pasados
        </button>
        <button type="button" className={`${styles.tabBtn} ${activeTab === 'transferencias' ? styles.active : ''}`} onClick={() => setActiveTab('transferencias')}>
          Transferencias
        </button>
        <button type="button" className={`${styles.tabBtn} ${activeTab === 'historial' ? styles.active : ''}`} onClick={() => setActiveTab('historial')}>
          Historial
        </button>
        <button type="button" className={`${styles.tabBtn} ${activeTab === 'perfil' ? styles.active : ''}`} onClick={() => setActiveTab('perfil')}>
          Perfil y ajustes
        </button>
      </div>

      <main className={styles.main}>
        {activeTab === 'tickets' ? (
          <>
            <div className={styles.head}>
              <h1 className={styles.title}>Mis Tickets</h1>
              <p className={styles.muted}>
                {totalTickets} boletos activos · {(upcomingEvents ?? []).length} evento(s) próximo(s)
              </p>
            </div>

            {error ? <div className={styles.error}>{error}</div> : null}

            {upcomingEvents === null && !error ? <div className={styles.skeleton} /> : null}

            {upcomingEvents && upcomingEvents.length === 0 && !error ? (
              <p className={styles.muted}>No tienes boletos activos para eventos próximos.</p>
            ) : null}

            {upcomingEvents?.map((ev) => (
              <section className={styles.eventGroup} key={ev.codigoEvento}>
                <div className={styles.eventGroupHead}>
                  <div>
                    <h2 className={styles.eventGroupName}>{ev.evento}</h2>
                    <p className={styles.eventGroupDate}>{formatDate(ev.fechaEvento)} · {ev.ubicacionEvento || ev.artista}</p>
                  </div>
                </div>

                <div className={styles.ticketsGrid}>
                  {ev.tickets.map((t) => renderTicketCard(ev, t))}
                </div>
              </section>
            ))}
          </>
        ) : null}

        {activeTab === 'pasados' ? (
          <>
            <div className={styles.head}>
              <h1 className={styles.title}>Eventos Pasados</h1>
              <p className={styles.muted}>Tus eventos asistidos recientemente</p>
            </div>
            {pastEvents === null && !error ? <div className={styles.skeleton} /> : null}
            {pastEvents && pastEvents.length === 0 ? <p className={styles.muted}>No tienes eventos pasados.</p> : null}
            {pastEvents?.map((ev) => (
              <section className={styles.eventGroup} key={`past-${ev.codigoEvento}`}>
                <div className={styles.eventGroupHead}>
                  <div>
                    <h2 className={styles.eventGroupName}>{ev.evento}</h2>
                    <p className={styles.eventGroupDate}>{formatDate(ev.fechaEvento)} · {ev.ubicacionEvento || ev.artista}</p>
                  </div>
                </div>
                <div className={styles.ticketsGrid}>
                  {ev.tickets.map((t) => renderTicketCard(ev, t, 'Ticket inactivo'))}
                </div>
              </section>
            ))}
          </>
        ) : null}

        {activeTab === 'transferencias' ? (
          <>
            <div className={styles.head}>
              <h1 className={styles.title}>Transferir Boleto</h1>
              <p className={styles.muted}>Envia tus boletos de forma segura</p>
            </div>
            <section className={styles.transferLayout}>
              <aside className={styles.transferSide}>
                <div className={styles.transferEventCard}>
                  <div className={styles.transferPhoto}>EVENTO</div>
                  <div className={styles.transferInfo}>
                    <strong>{upcomingEvents?.[0]?.evento || 'Evento seleccionado'}</strong>
                    <p>{upcomingEvents?.[0] ? formatDate(upcomingEvents[0].fechaEvento) : 'Sin fecha'}</p>
                  </div>
                </div>
                <div className={styles.securityNote}>
                  Tu transferencia esta protegida. El destinatario debe aceptar el boleto.
                </div>
              </aside>

              <div className={styles.transferMain}>
                <div className={styles.stepsBar}>
                  <div className={`${styles.stepItem} ${transferStep === 1 ? styles.stepActive : transferStep > 1 ? styles.stepDone : ''}`}>1. Destinatario</div>
                  <div className={`${styles.stepItem} ${transferStep === 2 ? styles.stepActive : transferStep > 2 ? styles.stepDone : ''}`}>2. Boletos</div>
                  <div className={`${styles.stepItem} ${transferStep === 3 ? styles.stepActive : ''}`}>3. Confirmar</div>
                </div>

                {transferStep === 1 ? (
                  <div className={styles.stepCard}>
                    <h3>¿A quien envias?</h3>
                    <input className={styles.input} placeholder="correo@ejemplo.com" />
                    <input className={styles.input} placeholder="Mensaje opcional" />
                    <div className={styles.stepActions}>
                      <button className={styles.btnAccent} onClick={() => setTransferStep(2)}>Continuar</button>
                    </div>
                  </div>
                ) : null}

                {transferStep === 2 ? (
                  <div className={styles.stepCard}>
                    <h3>¿Que boletos transfieres?</h3>
                    <div className={styles.selectRow}>Ticket #15921 · General</div>
                    <div className={styles.selectRow}>Ticket #15786 · General</div>
                    <div className={styles.stepActions}>
                      <button className={styles.btnGhost} onClick={() => setTransferStep(1)}>Atras</button>
                      <button className={styles.btnAccent} onClick={() => setTransferStep(3)}>Continuar</button>
                    </div>
                  </div>
                ) : null}

                {transferStep === 3 ? (
                  <div className={styles.stepCard}>
                    <h3>Confirmar transferencia</h3>
                    <p className={styles.muted}>Revisa los detalles y confirma el envio.</p>
                    <div className={styles.stepActions}>
                      <button className={styles.btnGhost} onClick={() => setTransferStep(2)}>Atras</button>
                      <button className={styles.btnAccent}>Enviar transferencia</button>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </>
        ) : null}

        {activeTab === 'historial' ? (
          <>
            <div className={styles.head}>
              <h1 className={styles.title}>Historial</h1>
              <p className={styles.muted}>Todas tus compras y transacciones</p>
            </div>
            <section className={styles.historyTable}>
              <div className={styles.historyHeader}>
                <span>Evento</span><span>Fecha compra</span><span>Boletos</span><span>Total</span><span>Estado</span>
              </div>
              {historyRows.map((row, idx) => (
                <div key={`${row.evento}-${idx}-${row.fechaCompra}`} className={styles.historyRow}>
                  <span className={styles.historyEventCell}>
                    <span className={styles.historyThumb}>
                      {row.imagenEvento ? <img src={row.imagenEvento} alt={row.evento} loading="lazy" decoding="async" /> : null}
                    </span>
                    <span className={styles.historyEventMeta}>
                      <strong>{row.evento}</strong>
                      <small>{row.fechaEvento ? formatDate(row.fechaEvento) : 'Sin fecha de evento'}</small>
                    </span>
                  </span>
                  <span>{row.fechaCompra ? formatDate(row.fechaCompra) : 'Sin fecha'}</span>
                  <span>{row.boletos}</span>
                  <span>-{Math.round(row.total)}</span>
                  <span className={`${styles.statusPill} ${row.estado === 'TT' ? styles.statusTransfer : styles.statusOk}`}>
                    {row.estado === 'TT' ? 'Transferido' : 'Completado'}
                  </span>
                </div>
              ))}
              {historyRows.length === 0 ? <div className={styles.historyEmpty}>Sin historial disponible.</div> : null}
            </section>
          </>
        ) : null}

        {activeTab === 'perfil' ? (
          <>
            <div className={styles.head}>
              <h1 className={styles.title}>Perfil y Ajustes</h1>
              <p className={styles.muted}>Gestiona tu informacion personal y preferencias</p>
            </div>
            <section className={styles.settingsLayout}>
              <aside className={styles.settingsSidebar}>
                <div className={styles.settingsSection}>Mi cuenta</div>
                <button className={`${styles.settingsNav} ${settingsSection === 'info' ? styles.settingsActive : ''}`} onClick={() => setSettingsSection('info')}>
                  <User size={14} /> Informacion personal
                </button>
                <button className={`${styles.settingsNav} ${settingsSection === 'notif' ? styles.settingsActive : ''}`} onClick={() => setSettingsSection('notif')}>
                  <Bell size={14} /> Notificaciones
                </button>
                <button className={`${styles.settingsNav} ${settingsSection === 'security' ? styles.settingsActive : ''}`} onClick={() => setSettingsSection('security')}>
                  <Shield size={14} /> Seguridad
                </button>
              </aside>
              <div className={styles.settingsMain}>
                {settingsSection === 'info' ? (
                  <div className={styles.settingsCard}>
                    <h3 className={styles.settingsTitle}><User size={16} /> Informacion Personal</h3>
                    <p className={styles.settingsMuted}>Actualiza tu nombre, correo y numero de contacto.</p>
                    <div className={styles.avatarRow}>
                      <div className={styles.avatarLarge}>{initials.toUpperCase()}</div>
                      <div>
                        <div className={styles.avatarName}>{user?.nombre || 'Usuario'}</div>
                        <div className={styles.avatarMail}>{user?.correoElectronico || '—'}</div>
                        <button className={styles.smallGhostBtn}>Cambiar foto</button>
                      </div>
                    </div>
                    <div className={styles.formRow}>
                      <label className={styles.field}>
                        <span>Nombres</span>
                        <input className={styles.input} value={user?.nombre || ''} readOnly />
                      </label>
                      <label className={styles.field}>
                        <span>Apellidos</span>
                        <input className={styles.input} value={user?.usuario1 || ''} readOnly />
                      </label>
                    </div>
                    <label className={styles.field}>
                      <span>Correo electronico</span>
                      <input className={styles.input} value={user?.correoElectronico || ''} readOnly />
                    </label>
                    <label className={styles.field}>
                      <span>Numero de telefono</span>
                      <input className={styles.input} value={user?.numeroCelular || ''} readOnly />
                    </label>
                    <div className={styles.stepActions}>
                      <button className={styles.btnAccent}>Guardar cambios</button>
                      <button className={styles.btnGhost}>Cancelar</button>
                    </div>
                  </div>
                ) : null}

                {settingsSection === 'notif' ? (
                  <div className={styles.settingsCard}>
                    <h3 className={styles.settingsTitle}><Bell size={16} /> Notificaciones</h3>
                    <p className={styles.settingsMuted}>Controla que notificaciones quieres recibir.</p>
                    <div className={styles.prefRow}>
                      <div><strong>Recordatorio de evento</strong><small>Notificacion 24h antes de cada evento</small></div>
                      <button className={`${styles.toggle} ${notifPrefs.reminder ? styles.toggleOn : ''}`} onClick={() => setNotifPrefs((p) => ({ ...p, reminder: !p.reminder }))} />
                    </div>
                    <div className={styles.prefRow}>
                      <div><strong>Transferencias recibidas</strong><small>Cuando alguien te transfiere un boleto</small></div>
                      <button className={`${styles.toggle} ${notifPrefs.transfers ? styles.toggleOn : ''}`} onClick={() => setNotifPrefs((p) => ({ ...p, transfers: !p.transfers }))} />
                    </div>
                    <div className={styles.prefRow}>
                      <div><strong>Nuevos eventos</strong><small>Eventos nuevos de categorias que sigues</small></div>
                      <button className={`${styles.toggle} ${notifPrefs.newEvents ? styles.toggleOn : ''}`} onClick={() => setNotifPrefs((p) => ({ ...p, newEvents: !p.newEvents }))} />
                    </div>
                    <div className={styles.prefRow}>
                      <div><strong>Ofertas y preventa</strong><small>Acceso anticipado y descuentos especiales</small></div>
                      <button className={`${styles.toggle} ${notifPrefs.offers ? styles.toggleOn : ''}`} onClick={() => setNotifPrefs((p) => ({ ...p, offers: !p.offers }))} />
                    </div>
                    <div className={styles.prefRow}>
                      <div><strong>Correos de marketing</strong><small>Novedades y contenido editorial de Primetix</small></div>
                      <button className={`${styles.toggle} ${notifPrefs.marketing ? styles.toggleOn : ''}`} onClick={() => setNotifPrefs((p) => ({ ...p, marketing: !p.marketing }))} />
                    </div>
                  </div>
                ) : null}

                {settingsSection === 'security' ? (
                  <div className={styles.settingsCard}>
                    <h3 className={styles.settingsTitle}><Shield size={16} /> Seguridad de Cuenta</h3>
                    <p className={styles.settingsMuted}>Gestiona el acceso y la seguridad de tu cuenta.</p>
                    <div className={styles.prefRow}>
                      <div><strong>Metodo de acceso</strong><small>Codigo de verificacion por WhatsApp</small></div>
                      <button className={styles.smallGhostBtn}>Cambiar</button>
                    </div>
                    <div className={styles.prefRow}>
                      <div><strong>Ultimo acceso</strong><small>Hoy · Guatemala City · Chrome</small></div>
                      <span className={styles.statusNow}>Activo ahora</span>
                    </div>
                    <div className={styles.stepActions}>
                      <button className={styles.btnDanger} onClick={() => logout()}><LogOut size={14} /> Cerrar sesion</button>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </>
        ) : null}
      </main>

      {timelineOpen ? (
        <div className={styles.modalBackdrop} onClick={() => setTimelineOpen(false)}>
          <div className={styles.historyModalCard} onClick={(e) => e.stopPropagation()}>
              <button type="button" className={styles.modalClose} onClick={() => setTimelineOpen(false)} aria-label="Cerrar">
                <CloseGlyph />
              </button>
            <div className={styles.historyHead}>
              <div className={styles.historyHeadImage}>
                {timelineEventInfo?.image ? <img src={timelineEventInfo.image} alt={timelineEventInfo.eventName} /> : null}
              </div>
              <div className={styles.historyHeadInfo}>
                <h3>{timelineEventInfo?.eventName || `Ticket #${timelineTicket ?? '—'}`}</h3>
                <p>{timelineEventInfo?.artist || 'Artista'}</p>
                <div className={styles.historyHeadMeta}>
                  <span>{timelineEventInfo?.locality || 'Localidad'}</span>
                  <span>{timelineEventInfo?.seat || 'Asiento'}</span>
                  <span>Ticket #{timelineTicket ?? '—'}</span>
                </div>
              </div>
            </div>
            {timelineLoading ? <p className={styles.muted}>Cargando historial...</p> : null}
            {timelineError ? <p className={styles.error}>{timelineError}</p> : null}
            {!timelineLoading && !timelineError && timelineItems.length === 0 ? (
              <p className={styles.muted}>Sin movimientos registrados.</p>
            ) : null}
            {!timelineLoading && timelineItems.length > 0 ? (
              <div className={styles.historyTimeline}>
                {timelineItems.slice(0, 1).map((item, idx) => {
                  const rawDate =
                    (typeof item.fecha === 'string' && item.fecha) ||
                    (typeof (item as any).fechaAccion === 'string' && (item as any).fechaAccion) ||
                    (typeof (item as any).fechaRegistro === 'string' && (item as any).fechaRegistro) ||
                    '';
                  const text =
                    (typeof item.descripcion === 'string' && item.descripcion) ||
                    (typeof (item as any).accion === 'string' && (item as any).accion) ||
                    (typeof item.detalle === 'string' && item.detalle) ||
                    (typeof item.estado === 'string' && item.estado) ||
                    'Actualización de ticket';
                  return (
                    <div key={`${idx}-${rawDate}`} className={styles.historyTimelineRow}>
                      <div className={styles.historyTimelineDate}>{rawDate ? formatDate(rawDate) : 'Sin fecha'}</div>
                      <div className={styles.historyTimelineMarkerWrap}>
                        <div className={styles.historyTimelineLine} />
                        <div className={styles.historyTimelineMarker}>🛒</div>
                      </div>
                      <div className={styles.historyTimelineText}>{text}</div>
                    </div>
                  );
                })}
              </div>
            ) : null}
            {!timelineLoading && timelineItems.length === 0 && !timelineError ? (
              <div className={styles.historyTimeline}>
                <div className={styles.historyTimelineRow}>
                  <div className={styles.historyTimelineDate}>Sin fecha</div>
                  <div className={styles.historyTimelineMarkerWrap}>
                    <div className={styles.historyTimelineLine} />
                    <div className={styles.historyTimelineMarker}>🛒</div>
                  </div>
                  <div className={styles.historyTimelineText}>Ticket generado y activo para uso.</div>
                </div>
              </div>
            ) : null}
            {!timelineLoading && timelineItems.length > 1 ? (
              <div className={styles.historyTimelineMobileHint}>
                {/* Keeps spacing parity with legacy modal footer area */}
                <span />
              </div>
            ) : null}
            {!timelineLoading && timelineItems.length > 1 ? (
              <div className={styles.historyTimelineListCompact}>
                {timelineItems.slice(1).map((item, idx) => {
                  const rawDate =
                    (typeof item.fecha === 'string' && item.fecha) ||
                    (typeof (item as any).fechaAccion === 'string' && (item as any).fechaAccion) ||
                    (typeof (item as any).fechaRegistro === 'string' && (item as any).fechaRegistro) ||
                    '';
                  const text =
                    (typeof item.descripcion === 'string' && item.descripcion) ||
                    (typeof (item as any).accion === 'string' && (item as any).accion) ||
                    (typeof item.detalle === 'string' && item.detalle) ||
                    (typeof item.estado === 'string' && item.estado) ||
                    'Actualización de ticket';
                  return (
                    <div key={`extra-${idx}-${rawDate}`} className={styles.timelineItem}>
                      <div className={styles.timelineDot} />
                      <div>
                        <div className={styles.timelineText}>{text}</div>
                        <div className={styles.timelineDate}>{rawDate ? formatDate(rawDate) : 'Sin fecha'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {shareOpen && shareData ? (
        <div className={styles.modalBackdrop} onClick={() => setShareOpen(false)}>
          <div className={styles.shareModalCard} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.modalClose} onClick={() => setShareOpen(false)} aria-label="Cerrar">
              <CloseGlyph />
            </button>
            <div
              className={styles.shareStage}
              style={{
                backgroundImage: shareData.image
                  ? `linear-gradient(0deg, rgba(0,0,0,.52), rgba(0,0,0,.52)), url(${shareData.image})`
                  : undefined,
              }}
            >
              <div className={styles.shareTicketPreview}>
                <div className={styles.shareTicketHead}>
                  <img src={logoSrc} alt="Primetix" />
                  <span>Primetix</span>
                </div>
                <div className={styles.shareTicketImageWrap}>
                  {shareData.image ? <img src={shareData.image} alt={shareData.eventName} /> : null}
                </div>
                <div className={styles.shareTicketBody}>
                  <h4>{shareData.eventName}</h4>
                  <p>{shareData.artist}</p>
                  <small>{formatDate(shareData.eventDate)}</small>
                  <div className={styles.shareMetaGrid}>
                    <div>
                      <span className={styles.metaLabel}>Localidad</span>
                      <span className={styles.metaValue}>{shareData.locality || 'General'}</span>
                    </div>
                    <div>
                      <span className={styles.metaLabel}>Ticket</span>
                      <span className={styles.metaValue}>#{shareData.ticketCode}</span>
                    </div>
                  </div>
                  <div className={styles.shareDisclaimer}>No valido como ticket</div>
                </div>
              </div>
            </div>

            <div className={styles.shareActionsWrap}>
              <h5>Compartir</h5>
              <div className={styles.shareActions}>
                <button
                  type="button"
                  className={styles.shareIconBtn}
                  title="Compartir en Facebook"
                  onClick={() => {
                    const link = `${window.location.origin}/ticketqr/${shareData.eventCode}/${shareData.ticketCode}/${shareData.seatCode}`;
                    const text = encodeURIComponent(`Mira mi ticket de ${shareData.eventName}`);
                    const url = encodeURIComponent(link);
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`, '_blank', 'noopener,noreferrer');
                  }}
                >
                  <Facebook size={18} />
                </button>
                <button
                  type="button"
                  className={styles.shareIconBtn}
                  title="Compartir por WhatsApp"
                  onClick={() => {
                    const link = `${window.location.origin}/ticketqr/${shareData.eventCode}/${shareData.ticketCode}/${shareData.seatCode}`;
                    const msg = encodeURIComponent(`Mira mi ticket de ${shareData.eventName} ${link}`);
                    window.open(`https://wa.me/?text=${msg}`, '_blank', 'noopener,noreferrer');
                  }}
                >
                  <WhatsAppGlyph />
                </button>
                <button
                  type="button"
                  className={styles.shareIconBtn}
                  title="Compartir / copiar enlace"
                  onClick={async () => {
                    const link = `${window.location.origin}/ticketqr/${shareData.eventCode}/${shareData.ticketCode}/${shareData.seatCode}`;
                    try {
                      if (navigator.share) {
                        await navigator.share({
                          title: `Ticket ${shareData.eventName}`,
                          text: `Ticket #${shareData.ticketCode}`,
                          url: link,
                        });
                        return;
                      }
                    } catch {
                      // fallback to clipboard
                    }
                    await navigator.clipboard.writeText(link);
                  }}
                >
                  <Download size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
