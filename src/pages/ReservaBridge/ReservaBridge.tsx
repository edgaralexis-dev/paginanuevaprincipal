import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getCompraRapidaImageUrl,
  getEventDataById,
  getEventDetailById,
  getInteractiveSvgSourceForBooking,
  isSvgUrl,
} from '../../services/events';
import { getSeatPieMap, getSeatsMap, type SeatMap, type SeatMapPie } from '../../services/seats';
import styles from './reserva.module.css';

export default function ReservaBridge() {
  const { eventName, eventArtist, eventId } = useParams();
  const [seats, setSeats] = useState<SeatMap[]>([]);
  const [pieSeats, setPieSeats] = useState<SeatMapPie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventImage, setEventImage] = useState<string>('');
  const [eventMapImage, setEventMapImage] = useState<string>('');
  const [eventInteractiveSvgSrc, setEventInteractiveSvgSrc] = useState<string>('');
  const [eventLocation, setEventLocation] = useState<string>('');
  const [eventDate, setEventDate] = useState<string>('');
  const [spotifyUrl, setSpotifyUrl] = useState<string>('');
  const [svgMarkup, setSvgMarkup] = useState<string>('');
  const [svgMapError, setSvgMapError] = useState<string>('');
  const [mapScale, setMapScale] = useState(1);
  const [mapPan, setMapPan] = useState({ x: 0, y: 0 });
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [seatTooltip, setSeatTooltip] = useState<{
    x: number;
    y: number;
    title: string;
    seatName: string;
    price: number;
    status: string;
  } | null>(null);
  const [activeSeatCode, setActiveSeatCode] = useState<number | null>(null);
  const [selectedLocality, setSelectedLocality] = useState<string>('');
  const [selectedQtyByLocality, setSelectedQtyByLocality] = useState<Record<string, number>>({});
  const [secondsLeft, setSecondsLeft] = useState(10 * 60);
  const svgHostRef = useRef<HTMLDivElement | null>(null);
  const mapViewportRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const nombre = safeDecode(eventName) || 'Evento';
  const artista = safeDecode(eventArtist) || '—';
  const codigo = safeDecode(eventId) || '—';
  const eventIdNumber = Number(codigo);
  const isSvgMap = useMemo(
    () => isSvgUrl((eventInteractiveSvgSrc || eventMapImage || '').trim()),
    [eventInteractiveSvgSrc, eventMapImage],
  );

  useEffect(() => {
    let cancelled = false;
    if (!Number.isFinite(eventIdNumber) || eventIdNumber <= 0) {
      setLoading(false);
      setError('Código de evento inválido.');
      return;
    }
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [seatData, pieData] = await Promise.all([
          getSeatsMap(eventIdNumber),
          getSeatPieMap(eventIdNumber),
        ]);
        if (cancelled) return;
        setSeats(Array.isArray(seatData) ? seatData : []);
        setPieSeats(Array.isArray(pieData) ? pieData : []);

        const eventData = await getEventDataById(eventIdNumber);
        if (!cancelled && eventData) {
          setEventImage(eventData.imagenEvento || '');
          setEventMapImage(eventData.mapaUrl || '');
          setEventLocation(eventData.ubicacion || '');
          setEventDate(eventData.fechaHoraInicio || '');
          setSpotifyUrl((eventData.spotify || '').trim());
        }

        const eventDetail = await getEventDetailById(eventIdNumber);
        if (!cancelled && eventDetail) {
          const compraRapida = getCompraRapidaImageUrl(eventDetail) || '';
          const detailMap = (eventDetail.mapaUrl || '').trim();
          const svgSrc = getInteractiveSvgSourceForBooking(eventDetail) || '';
          const detailSpotify = (eventDetail.spotify || '').trim();
          if (compraRapida) setEventMapImage(compraRapida);
          else if (detailMap) setEventMapImage(detailMap);
          setEventInteractiveSvgSrc(svgSrc);
          if (detailSpotify) setSpotifyUrl(detailSpotify);
        }
      } catch {
        if (!cancelled) setError('No se pudo cargar el mapa y valores de localidades.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventIdNumber]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const svgSource = eventInteractiveSvgSrc || eventMapImage;
    if (!isSvgMap || !svgSource) {
      setSvgMarkup('');
      setSvgMapError('');
      return;
    }
    (async () => {
      try {
        const res = await fetch(svgSource);
        if (!res.ok) throw new Error(`HTTP_${res.status}`);
        const text = await res.text();
        if (!cancelled) {
          setSvgMarkup(text);
          setSvgMapError('');
        }
      } catch {
        if (!cancelled) {
          setSvgMarkup('');
          setSvgMapError('No se pudo cargar el mapa SVG interactivo.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventInteractiveSvgSrc, eventMapImage, isSvgMap]);

  const localityRows = useMemo(() => {
    const rows = new Map<string, { name: string; price: number; available: number; color?: string }>();
    for (const s of seats) {
      const name = (s.nombreLocalidad || s.nombreSector || 'Localidad').trim();
      if (!name) continue;
      const current = rows.get(name);
      const seatPrice = Number(s.precio || 0) + Number(s.fee || 0);
      const isAvailable = !['AR', 'VR', 'TI'].includes((s.estadoAsiento || '').toUpperCase());
      if (!current) {
        rows.set(name, {
          name,
          price: seatPrice,
          available: isAvailable ? 1 : 0,
          color: s.colorHexa,
        });
      } else {
        current.price = current.price > 0 ? Math.min(current.price, seatPrice || current.price) : seatPrice;
        current.available += isAvailable ? 1 : 0;
      }
    }

    for (const p of pieSeats) {
      const name = (p.nombreLocalidad || p.nombreSector || 'General').trim();
      const seatPrice = Number(p.precio || 0) + Number(p.fee || 0);
      const pieAvailableRaw =
        typeof p.asientosDisponibles === 'number'
          ? p.asientosDisponibles
          : typeof p.disponibilidad === 'number'
            ? p.disponibilidad
            : 0;
      const pieAvailable = Math.max(0, Number(pieAvailableRaw || 0));
      const current = rows.get(name);
      if (!current) {
        rows.set(name, {
          name,
          price: seatPrice,
          available: pieAvailable,
          color: p.colorHexa,
        });
      } else {
        current.price = current.price > 0 ? Math.min(current.price, seatPrice || current.price) : seatPrice;
        current.available += pieAvailable;
        if (!current.color && p.colorHexa) current.color = p.colorHexa;
      }
    }

    return [...rows.values()].sort((a, b) => a.price - b.price);
  }, [pieSeats, seats]);

  useEffect(() => {
    if (!selectedLocality && localityRows.length > 0) {
      const firstAvailable = localityRows.find((x) => x.available > 0);
      setSelectedLocality((firstAvailable || localityRows[0]).name);
    }
  }, [localityRows, selectedLocality]);

  const selectedRow = useMemo(
    () => localityRows.find((x) => x.name === selectedLocality) || null,
    [localityRows, selectedLocality],
  );

  const totalTickets = useMemo(
    () => Object.values(selectedQtyByLocality).reduce((acc, n) => acc + Number(n || 0), 0),
    [selectedQtyByLocality],
  );

  const totalAmount = useMemo(
    () =>
      localityRows.reduce((acc, row) => {
        const q = Number(selectedQtyByLocality[row.name] || 0);
        return acc + q * row.price;
      }, 0),
    [localityRows, selectedQtyByLocality],
  );

  const selectedPayload = useMemo(() => {
    const out = localityRows
      .map((row) => ({
        name: row.name,
        qty: Number(selectedQtyByLocality[row.name] || 0),
        unitPrice: row.price,
      }))
      .filter((x) => x.qty > 0);
    return JSON.stringify(out);
  }, [localityRows, selectedQtyByLocality]);

  const selectedSeatsPayload = useMemo(() => {
    const blockedStates = new Set(['AR', 'VR', 'TI']);
    const groupedAvailable = new Map<string, SeatMap[]>();
    for (const seat of seats) {
      const loc = (seat.nombreLocalidad || seat.nombreSector || '').trim();
      if (!loc) continue;
      if (blockedStates.has((seat.estadoAsiento || '').toUpperCase())) continue;
      const bucket = groupedAvailable.get(loc) || [];
      bucket.push(seat);
      groupedAvailable.set(loc, bucket);
    }
    for (const [loc, list] of groupedAvailable) {
      list.sort((a, b) => Number(a.codigo || 0) - Number(b.codigo || 0));
      groupedAvailable.set(loc, list);
    }

    const out: Array<{
      name: string;
      codigoAsiento: number;
      codigoTicket: number;
      reventa: boolean;
      precioUnitario: number;
    }> = [];

    for (const row of localityRows) {
      const qty = Number(selectedQtyByLocality[row.name] || 0);
      if (qty <= 0) continue;
      const availableSeats = groupedAvailable.get(row.name) || [];
      for (let i = 0; i < qty; i += 1) {
        const seat = availableSeats[i];
        out.push({
          name: row.name,
          codigoAsiento: Number(seat?.codigo || 0),
          codigoTicket: 0,
          reventa: false,
          precioUnitario: Number(seat ? Number(seat.precio || 0) + Number(seat.fee || 0) : row.price || 0),
        });
      }
    }

    return JSON.stringify(out);
  }, [localityRows, seats, selectedQtyByLocality]);

  const seatByCode = useMemo(() => {
    const map = new Map<number, SeatMap>();
    for (const s of seats) map.set(Number(s.codigo), s);
    return map;
  }, [seats]);

  const changeQty = (name: string, next: number, max: number) => {
    const clamped = Math.max(0, Math.min(next, Math.max(0, max)));
    setSelectedQtyByLocality((prev) => ({ ...prev, [name]: clamped }));
  };

  const checkoutHref = useMemo(
    () =>
      `/checkout?eventId=${encodeURIComponent(codigo)}&eventName=${encodeURIComponent(
        nombre,
      )}&eventArtist=${encodeURIComponent(artista)}&locality=${encodeURIComponent(
        selectedRow?.name || '',
      )}&unitPrice=${selectedRow?.price || 0}&qty=${Math.max(
        1,
        totalTickets,
      )}&selected=${encodeURIComponent(selectedPayload)}&selectedSeats=${encodeURIComponent(selectedSeatsPayload)}`,
    [
      artista,
      codigo,
      nombre,
      selectedPayload,
      selectedRow?.name,
      selectedRow?.price,
      selectedSeatsPayload,
      totalTickets,
    ],
  );

  const zoomIn = () => setMapScale((s) => Math.min(4, Number((s + 0.25).toFixed(2))));
  const zoomOut = () => setMapScale((s) => Math.max(1, Number((s - 0.25).toFixed(2))));
  const zoomReset = () => {
    setMapScale(1);
    setMapPan({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (!isSvgMap || !svgMarkup || !svgHostRef.current) return;
    const host = svgHostRef.current;
    const nodes = host.querySelectorAll('[id]');
    nodes.forEach((el) => {
      const seatCode = getSeatCodeFromSvgId(el.id);
      if (!seatCode) return;
      const seat = seatByCode.get(seatCode);
      if (!seat) return;
      const blocked = ['AR', 'VR', 'TI'].includes((seat.estadoAsiento || '').toUpperCase());
      (el as HTMLElement).style.cursor = blocked ? 'not-allowed' : 'pointer';
      const isActive = activeSeatCode === seatCode;
      (el as HTMLElement).style.stroke = isActive ? '#3dd87a' : 'none';
      (el as HTMLElement).style.strokeWidth = isActive ? '2' : '0';
      (el as HTMLElement).style.opacity = blocked ? '0.28' : '1';
    });
  }, [activeSeatCode, isSvgMap, seatByCode, svgMarkup]);

  const onSvgMapClick = (event: MouseEvent<HTMLDivElement>) => {
    if (isDraggingMap) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const withId = target.closest('[id]') as HTMLElement | null;
    const id = withId?.id || target.id || '';
    const seatCode = getSeatCodeFromSvgId(id);
    if (!seatCode) return;
    const seat = seatByCode.get(seatCode);
    if (!seat) return;
    const blocked = ['AR', 'VR', 'TI'].includes((seat.estadoAsiento || '').toUpperCase());
    if (blocked) return;
    const loc = seat.nombreLocalidad || seat.nombreSector || '';
    if (!loc) return;
    const locRow = localityRows.find((x) => x.name === loc);
    const max = locRow?.available ?? 0;
    setSelectedLocality(loc);
    setActiveSeatCode(seatCode);
    changeQty(loc, Number(selectedQtyByLocality[loc] || 0) + 1, max);
    setSeatTooltip(buildTooltipData(event, seat));
  };

  const onMapPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    const withId = target?.closest('[id]') as HTMLElement | null;
    const seatCode = getSeatCodeFromSvgId(withId?.id || target?.id || '');
    // Si estamos sobre un asiento/shape con id de asiento, priorizar tooltip/selección y no iniciar pan.
    if (seatCode) return;
    (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      panX: mapPan.x,
      panY: mapPan.y,
    };
    setIsDraggingMap(false);
  };

  const onMapPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) setIsDraggingMap(true);
    setMapPan({
      x: start.panX + dx,
      y: start.panY + dy,
    });
  };

  const onMapPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    (event.currentTarget as HTMLDivElement).releasePointerCapture(event.pointerId);
    window.setTimeout(() => setIsDraggingMap(false), 0);
    dragStartRef.current = null;
  };

  const onSvgMapMove = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const withId = target.closest('[id]') as HTMLElement | null;
    const seatCode = getSeatCodeFromSvgId(withId?.id || target.id || '');
    if (!seatCode) {
      setSeatTooltip(null);
      return;
    }
    const seat = seatByCode.get(seatCode);
    if (!seat) {
      setSeatTooltip(null);
      return;
    }
    setSeatTooltip(buildTooltipData(event, seat));
  };

  const onSvgMapLeave = () => setSeatTooltip(null);

  const buildTooltipData = (event: MouseEvent<HTMLDivElement>, seat: SeatMap) => {
    const viewport = mapViewportRef.current;
    const rect = viewport?.getBoundingClientRect();
    const rawX = rect ? event.clientX - rect.left + 12 : 12;
    const rawY = rect ? event.clientY - rect.top + 12 : 12;
    const maxX = rect ? Math.max(12, rect.width - 220) : 240;
    const maxY = rect ? Math.max(12, rect.height - 130) : 240;
    const x = Math.max(12, Math.min(rawX, maxX));
    const y = Math.max(12, Math.min(rawY, maxY));
    const status = estadoAsientoLabel(seat.estadoAsiento);
    return {
      x,
      y,
      title: (seat.nombreLocalidad || seat.nombreSector || 'Localidad').replaceAll('_', ' '),
      seatName: seat.nombre || `Asiento ${seat.codigo}`,
      price: Number(seat.precio || 0) + Number(seat.fee || 0),
      status,
    };
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Link to="/eventos" className={styles.back}>
          ← Ver eventos
        </Link>

        <div className={styles.card}>
          <div className={styles.hero} aria-hidden>
            {eventImage ? <img src={eventImage} alt={nombre} /> : null}
            <div className={styles.grad} />
          </div>
          <div className={styles.body}>
            <h1 className={styles.title}>{nombre}</h1>
            <p className={styles.meta}>
              <strong>Artista</strong>: {artista}
              <br />
              <strong>Código</strong>: {codigo}
              {eventLocation ? (
                <>
                  <br />
                  <strong>Ubicación</strong>: {eventLocation}
                </>
              ) : null}
              {eventDate ? (
                <>
                  <br />
                  <strong>Fecha</strong>: {formatDate(eventDate)}
                </>
              ) : null}
            </p>

            {spotifyUrl ? (
              <div className={styles.spotifyWrap}>
                <iframe
                  src={`${spotifyUrl.replace('intl-es', 'embed')}?utm_source=generator`}
                  width="100%"
                  height="152"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  title={`Spotify ${nombre}`}
                />
              </div>
            ) : null}

            <div className={styles.selectionBar}>
              <div className={styles.selectionPrice}>
                {selectedRow
                  ? `Desde Q ${selectedRow.price.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`
                  : 'Sin precio'}
              </div>
              <div className={styles.selectionPrice}>Tickets: {totalTickets}</div>
              <div className={styles.selectionPrice}>
                Total: Q {totalAmount.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
              </div>
            </div>

            {loading ? <div className={styles.hint}>Cargando mapa y valores...</div> : null}
            {error ? <div className={styles.error}>{error}</div> : null}

            {!loading && localityRows.length > 0 ? (
              <div className={styles.localityLayout}>
                <div className={styles.mapPanel}>
                  <div className={styles.mapVisual}>
                    <div
                      className={`${styles.mapViewport} ${isDraggingMap ? styles.mapViewportDragging : ''}`}
                      ref={mapViewportRef}
                      onPointerDown={onMapPointerDown}
                      onPointerMove={onMapPointerMove}
                      onPointerUp={onMapPointerUp}
                    >
                      <div
                        className={styles.mapZoomLayer}
                        style={{ transform: `translate(${mapPan.x}px, ${mapPan.y}px) scale(${mapScale})` }}
                      >
                        {isSvgMap && svgMarkup ? (
                          <div
                            ref={svgHostRef}
                            className={styles.svgMapHost}
                            onClick={onSvgMapClick}
                            onMouseMove={onSvgMapMove}
                            onMouseLeave={onSvgMapLeave}
                            dangerouslySetInnerHTML={{ __html: svgMarkup }}
                          />
                        ) : eventMapImage || eventImage ? (
                          <img src={eventMapImage || eventImage} alt={`Mapa visual de ${nombre}`} />
                        ) : (
                          <div className={styles.mapVisualPlaceholder}>Mapa del evento</div>
                        )}
                      </div>
                    </div>
                    <div className={styles.mapControls}>
                      <button type="button" className={`${styles.mapCtlBtn} ${styles.mapCtlHome}`} onClick={zoomReset} aria-label="Reset">
                        <svg viewBox="0 0 24 24" aria-hidden>
                          <path
                            d="M4 11.5L12 5l8 6.5M7 10.5V19h10v-8.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      <div className={styles.mapCtlStack}>
                        <button type="button" className={styles.mapCtlBtn} onClick={zoomIn} aria-label="Acercar">
                          +
                        </button>
                        <button type="button" className={styles.mapCtlBtn} onClick={zoomOut} aria-label="Alejar">
                          -
                        </button>
                      </div>
                    </div>
                    <div className={styles.mapVisualLabel}>Mapa del evento</div>
                    {seatTooltip ? (
                      <div
                        className={styles.seatTooltip}
                        style={{ left: `${seatTooltip.x}px`, top: `${seatTooltip.y}px` }}
                      >
                        <div className={styles.seatTooltipTitle}>{seatTooltip.title}</div>
                        <div className={styles.seatTooltipRow}>
                          <span>{seatTooltip.seatName}</span>
                        </div>
                        <div className={styles.seatTooltipPrice}>
                          Q {seatTooltip.price.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                        </div>
                        <div className={styles.seatTooltipStatus}>{seatTooltip.status}</div>
                      </div>
                    ) : null}
                  </div>
                  {svgMapError ? <div className={styles.error}>{svgMapError}</div> : null}
                </div>

                <div className={styles.pricePanel}>
                  <div className={styles.timeHeader}>
                    Tiempo restante: {formatSecondsMMSS(secondsLeft)} min
                  </div>
                  <div className={styles.selectedHeader}>Tickets seleccionados</div>
                  {localityRows.map((row) => (
                    <div
                      key={`price-${row.name}`}
                      className={`${styles.priceRow} ${selectedLocality === row.name ? styles.priceRowActive : ''}`}
                      onClick={() => setSelectedLocality(row.name)}
                    >
                      <span>{row.name.replaceAll('_', ' ')}</span>
                      <span>{row.available > 0 ? `${row.available} disp.` : 'Agotado'}</span>
                      <strong>Q {row.price.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</strong>
                      <div className={styles.qtyControls}>
                        <button
                          type="button"
                          className={styles.qtyBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            changeQty(row.name, Number(selectedQtyByLocality[row.name] || 0) - 1, row.available);
                          }}
                          disabled={Number(selectedQtyByLocality[row.name] || 0) <= 0}
                        >
                          -
                        </button>
                        <span className={styles.qtyValue}>{Number(selectedQtyByLocality[row.name] || 0)}</span>
                        <button
                          type="button"
                          className={styles.qtyBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            changeQty(row.name, Number(selectedQtyByLocality[row.name] || 0) + 1, row.available);
                          }}
                          disabled={row.available <= Number(selectedQtyByLocality[row.name] || 0)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className={styles.checkoutFooter}>
                    <div className={styles.checkoutTotal}>
                      <span>Total</span>
                      <strong>Q {totalAmount.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div className={styles.checkoutActions}>
                      <Link
                        to={checkoutHref}
                        className={styles.payBtn}
                        aria-disabled={totalTickets <= 0 || secondsLeft <= 0}
                        onClick={(e) => {
                          if (totalTickets <= 0 || secondsLeft <= 0) e.preventDefault();
                        }}
                      >
                        Ir a pagar
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {!loading && !error && localityRows.length === 0 ? (
              <div className={styles.hint}>No se encontraron localidades disponibles para este evento.</div>
            ) : null}

          </div>
        </div>
      </div>
    </div>
  );
}

function safeDecode(v: string | undefined): string {
  if (!v) return '';
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function formatDate(iso: string): string {
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

function getSeatCodeFromSvgId(id: string): number | null {
  if (!id) return null;
  const clean = id.trim();
  const patterns = [/^a_?(\d+)$/i, /^c_?(\d+)$/i, /^svg_?(\d+)$/i, /^(\d+)$/];
  for (const p of patterns) {
    const m = clean.match(p);
    if (m) return Number(m[1]);
  }
  const onlyDigits = clean.replace(/\D/g, '');
  if (!onlyDigits) return null;
  return Number(onlyDigits);
}

function estadoAsientoLabel(estado: string | undefined): string {
  const e = (estado || '').toUpperCase();
  if (e === 'AR') return 'Reservado';
  if (e === 'VR') return 'En reventa';
  if (e === 'TI') return 'No disponible';
  if (e === 'TA') return 'Disponible';
  return 'Disponible';
}

function formatSecondsMMSS(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(s / 60)
    .toString()
    .padStart(2, '0');
  const ss = Math.floor(s % 60)
    .toString()
    .padStart(2, '0');
  return `${mm}:${ss}`;
}
