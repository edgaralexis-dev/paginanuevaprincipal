import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ReactSvgPanZoomLoader, SvgLoaderSelectElement } from 'react-svg-pan-zoom-loader';
import { UncontrolledReactSVGPanZoom } from 'react-svg-pan-zoom';
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
  const [eventTipo, setEventTipo] = useState<string>('');
  const [width, setWidth] = useState(1);
  const [height, setHeight] = useState(1);
  const [isSvgLoaded, setIsSvgLoaded] = useState(false);
  const [svgPanZoomEnabled, setSvgPanZoomEnabled] = useState(true);
  const [isXs, setIsXs] = useState(false);
  const [pointX, setPointX] = useState(300);
  const [pointY, setPointY] = useState(300);
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
  const Viewer = useRef<UncontrolledReactSVGPanZoom | null>(null);
  const refDiv = useRef<HTMLDivElement | null>(null);

  const nombre = safeDecode(eventName) || 'Evento';
  const artista = safeDecode(eventArtist) || '—';
  const codigo = safeDecode(eventId) || '—';
  const eventIdNumber = Number(codigo);
  const mapInteractiveSrc = useMemo(() => {
    const a = (eventInteractiveSvgSrc || '').trim();
    if (a) return a;
    const m = (eventMapImage || '').trim();
    if (isSvgUrl(m)) return m;
    return '';
  }, [eventInteractiveSvgSrc, eventMapImage]);

  const canUsePanZoom = Boolean(mapInteractiveSrc) && svgPanZoomEnabled;

  const rasterMapSrc = useMemo(() => {
    if (mapInteractiveSrc && !svgPanZoomEnabled) return mapInteractiveSrc;
    return (eventMapImage || eventImage || '').trim();
  }, [mapInteractiveSrc, svgPanZoomEnabled, eventMapImage, eventImage]);

  const isMapaPie = eventTipo === 'Evento publico Mapa Pie';

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
          setEventTipo(eventDetail.tipoEvento || '');
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
    setIsSvgLoaded(false);
    setSvgPanZoomEnabled(true);
  }, [mapInteractiveSrc]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 599px)');
    const apply = () => setIsXs(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const fitViewerIfReady = useCallback(() => {
    const v = Viewer.current;
    if (!v || width <= 0 || height <= 0) return;
    const svgEl = document.getElementById('tooltip-id') as SVGSVGElement | null;
    const viewBox = svgEl?.getAttribute('viewBox');
    if (!viewBox || viewBox.trim().length === 0) return;
    v.fitToViewer();
  }, [width, height]);

  useEffect(() => {
    if (!isSvgLoaded) return;
    const id = window.setTimeout(fitViewerIfReady, 50);
    return () => window.clearTimeout(id);
  }, [isSvgLoaded, isXs, width, height, fitViewerIfReady]);

  useEffect(() => {
    const handleResize = () => fitViewerIfReady();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fitViewerIfReady]);

  useLayoutEffect(() => {
    if (!mapInteractiveSrc || !svgPanZoomEnabled) return () => {};
    const el = refDiv.current;
    if (!el) return () => {};
    const ro = new ResizeObserver(() => {
      const currentHeight = el.clientHeight || 0;
      setWidth(!isXs ? el.clientWidth || 0 : el.clientWidth || 300);
      if (currentHeight < 500) {
        setHeight(600);
      } else {
        setHeight(currentHeight);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isXs, mapInteractiveSrc, svgPanZoomEnabled, isSvgLoaded]);

  useEffect(() => {
    setPointX(width > 0 ? width / 2 : 300);
    setPointY(height > 0 ? height / 2 : 300);
  }, [width, height]);

  const handleSvgReady = () => {
    setIsSvgLoaded(true);
    const svgEl = document.getElementById('tooltip-id') as SVGSVGElement | null;
    const viewBox = svgEl?.getAttribute('viewBox')?.trim();
    if (!viewBox) {
      setSvgPanZoomEnabled(false);
      return;
    }
    setSvgPanZoomEnabled(true);
  };

  const viewerWidth = Number.isFinite(width) && width > 0 ? Math.max(width, 320) : 320;
  const viewerHeight = Number.isFinite(height) && height > 0 ? Math.max(height, 320) : 320;

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

  const handleHome = () => {
    const v = Viewer.current;
    if (!v) return;
    const svgEl = document.getElementById('tooltip-id') as SVGSVGElement | null;
    const viewBox = svgEl?.getAttribute('viewBox');
    if (!viewBox || viewBox.trim().length === 0) return;
    v.fitToViewer();
  };

  const handleZoomIn = () => {
    if (!Viewer.current || !Number.isFinite(pointX) || !Number.isFinite(pointY)) return;
    Viewer.current.zoom(pointX, pointY, 1.1);
  };

  const handleZoomOut = () => {
    if (!Viewer.current || !Number.isFinite(pointX) || !Number.isFinite(pointY)) return;
    Viewer.current.zoom(pointX, pointY, 0.9);
  };

  useEffect(() => {
    if (!canUsePanZoom || !isSvgLoaded) return;
    const svgRoot = document.getElementById('tooltip-id') as SVGSVGElement | null;
    if (!svgRoot) return;
    const nodes = svgRoot.querySelectorAll('[id]');
    nodes.forEach((el) => {
      const seatCode = resolveMapElementToSeatCode(svgRoot, el.id);
      if (seatCode == null) return;
      const seat = seatByCode.get(seatCode);
      if (!seat) return;
      const blocked = ['AR', 'VR', 'TI'].includes((seat.estadoAsiento || '').toUpperCase());
      (el as HTMLElement).style.cursor = blocked ? 'not-allowed' : 'pointer';
      const isActive = activeSeatCode === seatCode;
      (el as HTMLElement).style.stroke = isActive ? '#3dd87a' : 'none';
      (el as HTMLElement).style.strokeWidth = isActive ? '2' : '0';
      (el as HTMLElement).style.opacity = blocked ? '0.28' : '1';
    });
  }, [activeSeatCode, canUsePanZoom, isSvgLoaded, seatByCode]);

  const onSvgMapClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const withId = target.closest('[id]') as HTMLElement | null;
    const id = withId?.id || target.id || '';
    const svgRoot = document.getElementById('tooltip-id') as SVGSVGElement | null;
    const seatCode = resolveMapElementToSeatCode(svgRoot, id);
    if (seatCode == null) return;
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

  const onMapMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const el = refDiv.current;
    if (el) {
      const r = el.getBoundingClientRect();
      setPointX(event.clientX - r.left);
      setPointY(event.clientY - r.top);
    }
    onSvgMapMove(event);
  };

  const onSvgMapMove = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const withId = target.closest('[id]') as HTMLElement | null;
    const rawId = withId?.id || target.id || '';
    const svgRoot = document.getElementById('tooltip-id') as SVGSVGElement | null;
    const seatCode = resolveMapElementToSeatCode(svgRoot, rawId);
    const host = refDiv.current;
    if (seatCode == null) {
      if (host) host.style.cursor = '';
      setSeatTooltip(null);
      return;
    }
    const seat = seatByCode.get(seatCode);
    if (!seat) {
      if (host) host.style.cursor = '';
      setSeatTooltip(null);
      return;
    }
    const blocked = ['AR', 'VR', 'TI'].includes((seat.estadoAsiento || '').toUpperCase());
    if (host) host.style.cursor = blocked ? 'not-allowed' : 'pointer';
    setSeatTooltip(buildTooltipData(event, seat));
  };

  const onSvgMapLeave = () => {
    if (refDiv.current) refDiv.current.style.cursor = '';
    setSeatTooltip(null);
  };

  const buildTooltipData = (event: MouseEvent<HTMLDivElement>, seat: SeatMap) => {
    const viewport = refDiv.current;
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
                  <div
                    className={`${styles.mapVisualShell} ${isMapaPie ? styles.mapAspectMapaPie : styles.mapAspectBooking}`}
                  >
                    {canUsePanZoom ? (
                      <ReactSvgPanZoomLoader
                        className={styles.mapLoaderFill}
                        key={mapInteractiveSrc}
                        src={mapInteractiveSrc}
                        proxy={
                          <>
                            <SvgLoaderSelectElement selector="svg" id="tooltip-id" onSVGReady={handleSvgReady} />
                          </>
                        }
                        render={(content) => (
                          <div
                            ref={refDiv}
                            onMouseMove={onMapMouseMove}
                            onMouseLeave={onSvgMapLeave}
                            onClickCapture={onSvgMapClickCapture}
                            className={styles.mapPanZoomHost}
                          >
                            <UncontrolledReactSVGPanZoom
                              ref={Viewer}
                              width={viewerWidth}
                              height={viewerHeight}
                              background="white"
                              tool="auto"
                              detectPinchGesture
                              detectAutoPan={false}
                              scaleFactorMin={isXs ? 0.1 : 0.5}
                              scaleFactorMax={isXs ? 20 : 10}
                              toolbarProps={{ position: 'none' }}
                              miniatureProps={{ position: 'none' }}
                            >
                              <svg width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
                                {content}
                              </svg>
                            </UncontrolledReactSVGPanZoom>
                          </div>
                        )}
                      />
                    ) : rasterMapSrc ? (
                      <div className={styles.mapStaticInner}>
                        <img src={rasterMapSrc} alt={`Mapa visual de ${nombre}`} />
                      </div>
                    ) : (
                      <div className={styles.mapStaticInner}>
                        <div className={styles.mapVisualPlaceholder}>Mapa del evento</div>
                      </div>
                    )}
                    <div className={styles.mapOverlayUi}>
                      <div className={styles.mapControls}>
                        <button
                          type="button"
                          className={`${styles.mapCtlBtn} ${styles.mapCtlHome}`}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleHome();
                          }}
                          aria-label="Reset"
                        >
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
                          <button
                            type="button"
                            className={styles.mapCtlBtn}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleZoomIn();
                            }}
                            aria-label="Acercar"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            className={styles.mapCtlBtn}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleZoomOut();
                            }}
                            aria-label="Alejar"
                          >
                            -
                          </button>
                        </div>
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
                </div>

                <div className={styles.pricePanel}>
                  <div className={styles.timeHeader}>
                    Tiempo restante: {formatSecondsMMSS(secondsLeft)} min
                  </div>
                  <div className={styles.selectedHeader}>Tickets seleccionados</div>
                  <div className={styles.priceRowsScroll}>
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
                  </div>
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

/** Igual que `seatCodeFromElementId` en Booking: solo patrones de asiento (sin mezclar `m12`→12). */
function seatCodeFromStrictElementId(id: string): number | null {
  if (!id) return null;
  const clean = id.trim();
  const patterns = [/^a_?(\d+)$/i, /^c_?(\d+)$/i, /^svg_?(\d+)$/i, /^(\d+)$/];
  for (const p of patterns) {
    const m = clean.match(p);
    if (m) return Number(m[1]);
  }
  return null;
}

/**
 * Resuelve clic/hover del mapa a un código de asiento del API.
 * Mesas en SVG: overlay `m{n}` y grupo `g{n}` con hijos `a_*` / `c_*` (mismo criterio que Booking).
 */
function resolveMapElementToSeatCode(svg: SVGSVGElement | null, elementId: string): number | null {
  const id = elementId.trim();
  if (!id) return null;

  const direct = seatCodeFromStrictElementId(id);
  if (direct != null) return direct;

  if (!svg) return null;

  const mesaNum = id.match(/^m(\d+)$/i)?.[1];
  if (mesaNum) {
    const grupo = svg.querySelector(`#g${mesaNum}`);
    if (grupo) {
      for (const el of grupo.querySelectorAll('[id]')) {
        const c = seatCodeFromStrictElementId(el.id);
        if (c != null) return c;
      }
    }
    return null;
  }

  const grupoNum = id.match(/^g(\d+)$/i)?.[1];
  if (grupoNum) {
    const grupo = svg.querySelector(`#g${grupoNum}`);
    if (grupo) {
      for (const el of grupo.querySelectorAll('[id]')) {
        const c = seatCodeFromStrictElementId(el.id);
        if (c != null) return c;
      }
    }
  }

  return null;
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
