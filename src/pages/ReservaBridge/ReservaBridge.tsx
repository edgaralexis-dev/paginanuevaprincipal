import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CircleHelp } from 'lucide-react';
import logoSrc from '../../assets/LogoPrimetix.svg';
import { ReactSvgPanZoomLoader, SvgLoaderSelectElement } from 'react-svg-pan-zoom-loader';
import {
  getCompraRapidaImageUrl,
  getEventDataById,
  getEventDetailById,
  getInteractiveSvgSourceForBooking,
  isCompraRapidaFlujoEvento,
  isSvgUrl,
} from '../../services/events';
import {
  getSeatPieMap,
  getSeatsMap,
  quitarReservasPorUuid,
  reservarAsiento,
  type SeatMap,
  type SeatMapPie,
} from '../../services/seats';
import styles from './reserva.module.css';

const MAX_TICKETS_PER_PERSON = 6;

function getInitialStaticSvgScale(isXs: boolean): number {
  return isXs ? 0.78 : 0.62;
}

export default function ReservaBridge() {
  const { eventName, eventArtist, eventId } = useParams();
  const navigate = useNavigate();
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
  const [eventGenero, setEventGenero] = useState<string>('');
  const [localityFilterTab, setLocalityFilterTab] = useState<string>('ALL');
  const [mainStageView, setMainStageView] = useState<'mapa' | 'lista'>('mapa');
  const [compraRapidaFlujo, setCompraRapidaFlujo] = useState(false);
  const [isSvgLoaded, setIsSvgLoaded] = useState(false);
  const [svgPanZoomEnabled, setSvgPanZoomEnabled] = useState(true);
  const [isXs, setIsXs] = useState(false);
  const [staticSvgScale, setStaticSvgScale] = useState(getInitialStaticSvgScale(false));
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
  const [reserving, setReserving] = useState(false);
  /** Contenedor interactivo (cursor, tooltips). */
  const refDiv = useRef<HTMLDivElement | null>(null);
  const refMapMeasure = useRef<HTMLDivElement | null>(null);
  const refMapVisualShell = useRef<HTMLDivElement | null>(null);
  const zoneTabsRef = useRef<HTMLDivElement | null>(null);
  const uuidRef = useRef<string>('');

  const nombre = safeDecode(eventName) || 'Evento';
  const artista = safeDecode(eventArtist) || '—';
  const codigo = safeDecode(eventId) || '—';
  const eventIdNumber = Number(codigo);
  if (!uuidRef.current) {
    const existing = localStorage.getItem('uuid') || '';
    if (existing) uuidRef.current = existing;
    else {
      const generated = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`).toString();
      localStorage.setItem('uuid', generated);
      uuidRef.current = generated;
    }
  }
  const mapInteractiveSrc = useMemo(() => {
    const a = (eventInteractiveSvgSrc || '').trim();
    if (isSvgUrl(a)) return a;
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
          if (eventData.genero?.trim()) setEventGenero(eventData.genero.trim());
        }

        const eventDetail = await getEventDetailById(eventIdNumber);
        if (!cancelled && eventDetail) {
          const compraRapida = getCompraRapidaImageUrl(eventDetail) || '';
          const detailMap = (eventDetail.mapaUrl || '').trim();
          const svgSrc = getInteractiveSvgSourceForBooking(eventDetail) || '';
          const detailSpotify = (eventDetail.spotify || '').trim();
          // No sobreescribe un mapa ya cargado desde EventData; evita saltos/recortes al volver de Home.
          setEventMapImage((prev) => prev || detailMap || compraRapida || '');
          setEventInteractiveSvgSrc(svgSrc);
          if (detailSpotify) setSpotifyUrl(detailSpotify);
          setEventTipo(eventDetail.tipoEvento || '');
          const g = eventDetail.genero?.trim();
          if (g) setEventGenero(g);
          setCompraRapidaFlujo(isCompraRapidaFlujoEvento(eventDetail));
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
    if (!Number.isFinite(eventIdNumber) || eventIdNumber <= 0) return;
    if (secondsLeft > 0) return;
    void quitarReservasPorUuid(uuidRef.current, eventIdNumber);
  }, [secondsLeft, eventIdNumber]);

  useEffect(() => {
    if (!Number.isFinite(eventIdNumber) || eventIdNumber <= 0) return;
    return () => {
      void quitarReservasPorUuid(uuidRef.current, eventIdNumber);
    };
  }, [eventIdNumber]);

  useEffect(() => {
    setIsSvgLoaded(false);
    setSvgPanZoomEnabled(true);
    setStaticSvgScale(getInitialStaticSvgScale(isXs));
  }, [mapInteractiveSrc, isXs]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 599px)');
    const apply = () => setIsXs(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (canUsePanZoom || mainStageView !== 'mapa' || !rasterMapSrc) return;
    const triggerResize = () => window.dispatchEvent(new Event('resize'));
    triggerResize();
    const t1 = window.setTimeout(triggerResize, 80);
    const t2 = window.setTimeout(triggerResize, 220);
    const t3 = window.setTimeout(triggerResize, 520);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [canUsePanZoom, mainStageView, rasterMapSrc, isXs]);

  const handleSvgReady = () => {
    const svgEl = document.getElementById('tooltip-id') as SVGSVGElement | null;
    const rawViewBox = svgEl?.getAttribute('viewBox')?.trim();
    const widthAttr = svgEl?.getAttribute('width')?.trim() || '';
    const heightAttr = svgEl?.getAttribute('height')?.trim() || '';
    const parsedW = Number(widthAttr.replace(/[^\d.]/g, ''));
    const parsedH = Number(heightAttr.replace(/[^\d.]/g, ''));
    const fallbackViewBox =
      Number.isFinite(parsedW) && Number.isFinite(parsedH) && parsedW > 0 && parsedH > 0
        ? `0 0 ${parsedW} ${parsedH}`
        : '';
    const effectiveViewBox = rawViewBox || fallbackViewBox;
    if (!effectiveViewBox) {
      setSvgPanZoomEnabled(false);
      setIsSvgLoaded(false);
      return;
    }
    setSvgPanZoomEnabled(true);
    setIsSvgLoaded(true);
  };

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

  const filteredLocalityRows = useMemo(() => {
    if (localityFilterTab === 'ALL') return localityRows;
    return localityRows.filter((r) => r.name === localityFilterTab);
  }, [localityRows, localityFilterTab]);

  const zoneTabs = useMemo(() => {
    const names = localityRows.map((r) => r.name);
    return ['ALL', ...names] as const;
  }, [localityRows]);

  const [zoneTabsOverflow, setZoneTabsOverflow] = useState(false);
  const [zoneTabsScrollEdge, setZoneTabsScrollEdge] = useState({ start: true, end: true });

  const updateZoneTabsScrollState = useCallback(() => {
    const el = zoneTabsRef.current;
    if (!el || localityRows.length === 0) {
      setZoneTabsOverflow(false);
      setZoneTabsScrollEdge({ start: true, end: true });
      return;
    }
    const overflow = el.scrollWidth > el.clientWidth + 2;
    setZoneTabsOverflow(overflow);
    if (!overflow) {
      setZoneTabsScrollEdge({ start: true, end: true });
      return;
    }
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    setZoneTabsScrollEdge({
      start: el.scrollLeft <= 1,
      end: el.scrollLeft >= maxScroll - 1,
    });
  }, [localityRows.length]);

  useLayoutEffect(() => {
    const el = zoneTabsRef.current;
    if (!el || localityRows.length === 0) return;
    updateZoneTabsScrollState();
    const ro = new ResizeObserver(() => updateZoneTabsScrollState());
    ro.observe(el);
    el.addEventListener('scroll', updateZoneTabsScrollState, { passive: true });
    window.addEventListener('resize', updateZoneTabsScrollState);
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', updateZoneTabsScrollState);
      window.removeEventListener('resize', updateZoneTabsScrollState);
    };
  }, [localityRows.length, zoneTabs.length, updateZoneTabsScrollState]);

  const scrollZoneTabs = useCallback(
    (dir: -1 | 1) => {
      const el = zoneTabsRef.current;
      if (!el) return;
      el.scrollBy({ left: dir * 160, behavior: 'smooth' });
      window.setTimeout(updateZoneTabsScrollState, 320);
    },
    [updateZoneTabsScrollState],
  );

  /** Rueda del ratón → scroll horizontal (Windows suele usar delta en “líneas”; Mayús+rueda = horizontal). */
  useEffect(() => {
    const el = zoneTabsRef.current;
    if (!el || localityRows.length === 0) return;
    const lineMul = 48;
    const applyDeltaMode = (v: number, mode: number) => {
      if (mode === WheelEvent.DOM_DELTA_LINE) return v * lineMul;
      if (mode === WheelEvent.DOM_DELTA_PAGE) return v * (el.clientHeight || 320);
      return v;
    };
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth + 1) return;
      let delta = 0;
      if (e.shiftKey) {
        const primary = Math.abs(e.deltaX) >= Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        delta = applyDeltaMode(primary, e.deltaMode);
      } else {
        const dy = e.deltaY;
        const dx = e.deltaX;
        if (Math.abs(dx) >= Math.abs(dy)) return;
        delta = applyDeltaMode(dy, e.deltaMode);
      }
      if (Math.abs(delta) < 0.5) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (delta > 0 && el.scrollLeft >= maxScroll - 1) return;
      if (delta < 0 && el.scrollLeft <= 0) return;
      el.scrollLeft = Math.max(0, Math.min(maxScroll, el.scrollLeft + delta));
      e.preventDefault();
      updateZoneTabsScrollState();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [localityRows.length, zoneTabs.length, updateZoneTabsScrollState]);

  useEffect(() => {
    if (localityFilterTab !== 'ALL' && localityRows.some((r) => r.name === localityFilterTab)) {
      setSelectedLocality(localityFilterTab);
    }
  }, [localityFilterTab, localityRows]);

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
    const effMax = Math.min(Math.max(0, max), MAX_TICKETS_PER_PERSON);
    const clamped = Math.max(0, Math.min(next, effMax));
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
    setStaticSvgScale(getInitialStaticSvgScale(isXs));
  };

  const handleZoomIn = () => {
    setStaticSvgScale((s) => Math.min(2.4, s * 1.1));
  };

  const handleZoomOut = () => {
    setStaticSvgScale((s) => Math.max(0.2, s * 0.85));
  };

  const resaltarSoloLocalidadMesaSilla =
    compraRapidaFlujo &&
    Boolean(selectedLocality) &&
    localityEsMesaOSilla(selectedLocality);

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
      const loc = (seat.nombreLocalidad || seat.nombreSector || '').trim();
      const blocked = ['AR', 'VR', 'TI'].includes((seat.estadoAsiento || '').toUpperCase());
      (el as HTMLElement).style.cursor = blocked ? 'not-allowed' : 'pointer';
      const isActive = activeSeatCode === seatCode;
      (el as HTMLElement).style.stroke = isActive ? '#3dd87a' : 'none';
      (el as HTMLElement).style.strokeWidth = isActive ? '2' : '0';

      let opacity = blocked ? 0.28 : 1;
      if (resaltarSoloLocalidadMesaSilla && !blocked && loc !== selectedLocality) {
        opacity = 0.32;
      }
      (el as HTMLElement).style.opacity = String(opacity);
    });
  }, [
    activeSeatCode,
    canUsePanZoom,
    compraRapidaFlujo,
    isSvgLoaded,
    resaltarSoloLocalidadMesaSilla,
    seatByCode,
    selectedLocality,
  ]);

  /** Puntos de color por zona en el SVG (centroide de asientos del API en el mapa). */
  useEffect(() => {
    if (!canUsePanZoom || !isSvgLoaded || localityRows.length === 0 || seats.length === 0) return;

    let cancelled = false;
    const paint = () => {
      if (cancelled) return;
      const svg = document.getElementById('tooltip-id') as SVGSVGElement | null;
      if (!svg) return;
      svg.getElementById('primetix-zone-markers')?.remove();

      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.setAttribute('id', 'primetix-zone-markers');
      group.setAttribute('pointer-events', 'none');

      for (const row of localityRows) {
        const fill = hexToCssMarker(row.color);
        const codes = seats
          .filter((s) => (s.nombreLocalidad || s.nombreSector || '').trim() === row.name)
          .map((s) => Number(s.codigo))
          .filter((c) => Number.isFinite(c));
        const sample = codes.length > 100 ? codes.slice(0, 100) : codes;

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        let found = 0;

        for (const code of sample) {
          const el = findSeatSvgElementByCode(svg, code);
          if (!el) continue;
          try {
            const b = el.getBBox();
            if (!Number.isFinite(b.width) || !Number.isFinite(b.height) || b.width <= 0 || b.height <= 0) continue;
            minX = Math.min(minX, b.x);
            minY = Math.min(minY, b.y);
            maxX = Math.max(maxX, b.x + b.width);
            maxY = Math.max(maxY, b.y + b.height);
            found += 1;
          } catch {
            /* getBBox puede fallar si el nodo no está pintado */
          }
        }

        if (found === 0) continue;

        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const selected = row.name === selectedLocality;
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', String(cx));
        circle.setAttribute('cy', String(cy));
        circle.setAttribute('r', selected ? '18' : '14');
        circle.setAttribute('fill', fill);
        circle.setAttribute('fill-opacity', selected ? '0.95' : '0.72');
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', selected ? '3' : '2');
        group.appendChild(circle);
      }

      svg.appendChild(group);
    };

    const t = window.setTimeout(paint, 80);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      document.getElementById('primetix-zone-markers')?.remove();
    };
  }, [canUsePanZoom, isSvgLoaded, localityRows, seats, selectedLocality]);

  const onSvgMapClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    const interactiveId = getClosestInteractiveElementId(event.target, pieSeats);
    if (!interactiveId) return;
    let id = getClosestElementId(event.target);
    if (!id) id = interactiveId;
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
    setSeatTooltip(buildTooltipData(event, seat, seatCode, withId || target));
  };

  const onMapMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    onSvgMapMove(event);
  };

  const onSvgMapMove = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as Element | null;
    const withId = target?.closest('[id]') || null;
    const interactiveId = getClosestInteractiveElementId(event.target, pieSeats);
    if (!interactiveId) {
      const host = refDiv.current;
      if (host) host.style.cursor = '';
      setSeatTooltip(null);
      return;
    }
    let rawId = getClosestElementId(event.target);
    if (!rawId) rawId = interactiveId;
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
    setSeatTooltip(buildTooltipData(event, seat, seatCode, withId || target));
  };

  const onSvgMapLeave = () => {
    if (refDiv.current) refDiv.current.style.cursor = '';
    setSeatTooltip(null);
  };

  const handleRasterMapLoad = () => {
    window.dispatchEvent(new Event('resize'));
    window.setTimeout(() => window.dispatchEvent(new Event('resize')), 120);
  };

  const buildTooltipData = (
    event: MouseEvent<HTMLDivElement>,
    seat: SeatMap,
    seatCode?: number | null,
    hoveredEl?: Element | null,
  ) => {
    const viewport = refDiv.current;
    const rect = viewport?.getBoundingClientRect();
    const rawX = rect ? event.clientX - rect.left + 12 : 12;
    const rawY = rect ? event.clientY - rect.top + 12 : 12;
    const maxX = rect ? Math.max(12, rect.width - 220) : 240;
    const maxY = rect ? Math.max(12, rect.height - 130) : 240;
    const x = Math.max(12, Math.min(rawX, maxX));
    const y = Math.max(12, Math.min(rawY, maxY));
    const status = estadoAsientoLabel(seat.estadoAsiento);
    let seatName = seat.nombre || `Asiento ${seat.codigo}`;
    try {
      const svgRoot = document.getElementById('tooltip-id') as SVGSVGElement | null;
      const seatMeta = resolveSeatDisplayMeta(svgRoot, seatCode ?? Number(seat.codigo), hoveredEl);
      const seatNameFromMap =
        seatMeta.label || (seatMeta.mesa && seatMeta.silla ? `Mesa ${seatMeta.mesa} - Silla ${seatMeta.silla}` : '');
      if (seatNameFromMap) seatName = seatNameFromMap;
    } catch {
      // fallback a API si la lectura de metadata SVG falla por cualquier nodo/entorno.
    }
    return {
      x,
      y,
      title: (seat.nombreLocalidad || seat.nombreSector || 'Localidad').replaceAll('_', ' '),
      seatName,
      price: Number(seat.precio || 0) + Number(seat.fee || 0),
      status,
    };
  };

  const toCssHex = (hex?: string) => {
    const t = (hex || '').trim();
    if (!t) return '#3dd87a';
    return t.startsWith('#') ? t : `#${t}`;
  };

  const heroWhenWhere = formatReservaHeroLine(eventDate, eventLocation);

  const zoneCardAccent = (row: (typeof localityRows)[number]) => toCssHex(row.color);

  const renderZoneCard = (row: (typeof localityRows)[number]) => {
    const q = Number(selectedQtyByLocality[row.name] || 0);
    return (
      <div
        key={`zone-${row.name}`}
        role="button"
        tabIndex={0}
        className={`${styles.zoneCard} ${selectedLocality === row.name ? styles.zoneCardActive : ''}`}
        style={{ borderLeftColor: zoneCardAccent(row) }}
        onClick={() => setSelectedLocality(row.name)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setSelectedLocality(row.name);
          }
        }}
      >
        <div className={styles.zoneCardTop}>
          <span className={styles.zoneCardName}>{row.name.replaceAll('_', ' ')}</span>
          {q > 0 ? <span className={styles.zoneCardBadge}>{q}</span> : null}
        </div>
        <div className={styles.zoneCardMeta}>
          <span className={row.available > 0 ? styles.zoneCardAvail : styles.zoneCardSold}>
            {row.available > 0 ? `${row.available} disponibles` : 'Agotado'}
          </span>
          <strong className={styles.zoneCardPrice}>
            Q {row.price.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
          </strong>
        </div>
      </div>
    );
  };

  const reserveAndCheckout = useCallback(async () => {
    if (reserving || totalTickets <= 0 || secondsLeft <= 0) return;
    if (!Number.isFinite(eventIdNumber) || eventIdNumber <= 0) return;
    const nowIso = new Date().toISOString();
    const selectedSeatCodes = localityRows
      .flatMap((row) => {
        const qty = Number(selectedQtyByLocality[row.name] || 0);
        if (qty <= 0) return [];
        const available = seats
          .filter((s) => (s.nombreLocalidad || s.nombreSector || '').trim() === row.name)
          .filter((s) => !['AR', 'VR', 'TI'].includes((s.estadoAsiento || '').toUpperCase()))
          .sort((a, b) => Number(a.codigo || 0) - Number(b.codigo || 0))
          .slice(0, qty);
        return available.map((s) => Number(s.codigo || 0)).filter((x) => x > 0);
      })
      .filter((x) => Number.isFinite(x) && x > 0);

    if (selectedSeatCodes.length === 0) {
      navigate(checkoutHref);
      return;
    }

    setReserving(true);
    setError(null);
    try {
      for (const codigoAsiento of selectedSeatCodes) {
        const body = {
          codigoAsiento,
          uuid: uuidRef.current,
          cantidad: 1,
          esPie: false,
          codigoTicket: 0,
          fechaReserva: nowIso,
          socketId: uuidRef.current,
        };
        const r = await reservarAsiento(true, body);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
      }
      navigate(checkoutHref);
    } catch {
      setError('No se pudieron reservar todos los asientos. Intenta nuevamente.');
    } finally {
      setReserving(false);
    }
  }, [reserving, totalTickets, secondsLeft, eventIdNumber, localityRows, selectedQtyByLocality, seats, navigate, checkoutHref]);

  return (
    <div className={styles.page}>
      <header className={styles.reservaTopBar}>
        <Link to="/" className={styles.reservaLogo}>
          <img src={logoSrc} alt="Primetix" width={120} height={32} />
        </Link>
        <nav className={styles.breadcrumbs} aria-label="Ruta">
          <Link to="/eventos">Eventos</Link>
          {eventGenero ? (
            <>
              <span className={styles.crumbSep}>/</span>
              <span>{eventGenero}</span>
            </>
          ) : null}
          <span className={styles.crumbSep}>/</span>
          <span className={styles.crumbCurrent}>{nombre}</span>
        </nav>
        <Link to="/FAQs/general" className={styles.helpLink}>
          <CircleHelp size={18} strokeWidth={2} aria-hidden />
          Ayuda
        </Link>
      </header>

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
            <p className={styles.eventCategory}>
              <span className={styles.eventCategoryDot} aria-hidden />
              {eventGenero ? `${eventGenero.toUpperCase()} · ` : null}
              {artista}
            </p>
            <h1 className={styles.title}>{nombre}</h1>
            <p className={styles.heroLine}>{heroWhenWhere}</p>
            <p className={styles.metaMuted}>
              Código {codigo}
              {eventLocation && !heroWhenWhere.includes(eventLocation) ? ` · ${eventLocation}` : null}
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
              <div
                className={`${styles.localityLayout} ${mainStageView === 'lista' ? styles.localityLayoutLista : ''}`}
              >
                <div className={styles.mapPanel}>
                  {localityRows.length > 0 ? (
                    <div className={styles.mapLegend} aria-label="Leyenda del mapa">
                      {compraRapidaFlujo ? (
                        <>
                          {selectedLocality && localityEsMesaOSilla(selectedLocality) ? (
                            <span className={styles.legendItem}>
                              <span
                                className={styles.legendSwatch}
                                style={{
                                  background: toCssHex(
                                    localityRows.find((r) => r.name === selectedLocality)?.color,
                                  ),
                                }}
                                aria-hidden
                              />
                              <strong>{selectedLocality.replaceAll('_', ' ')}</strong>
                            </span>
                          ) : (
                            <span className={styles.legendHint}>
                              Elige una zona de <strong>mesas</strong> o <strong>sillas</strong> para ver solo su
                              color en el mapa.
                            </span>
                          )}
                          <span className={styles.legendItem}>
                            <span className={`${styles.legendSwatch} ${styles.legendSoldOut}`} aria-hidden />
                            Agotado
                          </span>
                          <span className={styles.legendItem}>
                            <span className={`${styles.legendSwatch} ${styles.legendSelected}`} aria-hidden />
                            Seleccionado
                          </span>
                        </>
                      ) : (
                        <>
                          {localityRows.map((row) => (
                            <span key={`leg-${row.name}`} className={styles.legendItem}>
                              <span
                                className={styles.legendSwatch}
                                style={{ background: toCssHex(row.color) }}
                                aria-hidden
                              />
                              {row.name.replaceAll('_', ' ')}
                            </span>
                          ))}
                          <span className={styles.legendItem}>
                            <span className={`${styles.legendSwatch} ${styles.legendSoldOut}`} aria-hidden />
                            Agotado
                          </span>
                          <span className={styles.legendItem}>
                            <span className={`${styles.legendSwatch} ${styles.legendSelected}`} aria-hidden />
                            Seleccionado
                          </span>
                        </>
                      )}
                    </div>
                  ) : null}

                  <div
                    ref={refMapVisualShell}
                    className={`${styles.mapVisualShell} ${isMapaPie ? styles.mapAspectMapaPie : styles.mapAspectBooking}`}
                  >
                    <div className={styles.mapStageToolbar}>
                      <div className={styles.mapViewToggle} role="group" aria-label="Vista del escenario">
                        <button
                          type="button"
                          className={mainStageView === 'mapa' ? styles.mapViewBtnOn : styles.mapViewBtn}
                          onClick={() => setMainStageView('mapa')}
                        >
                          Mapa
                        </button>
                        <button
                          type="button"
                          className={mainStageView === 'lista' ? styles.mapViewBtnOn : styles.mapViewBtn}
                          onClick={() => setMainStageView('lista')}
                        >
                          Lista
                        </button>
                      </div>
                    </div>

                    {mainStageView === 'lista' ? (
                      <div className={styles.listaStage}>{filteredLocalityRows.map((row) => renderZoneCard(row))}</div>
                    ) : canUsePanZoom ? (
                      <div ref={refMapMeasure} className={styles.mapLoaderFill}>
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
                              style={{
                                flex: 1,
                                minHeight: 0,
                                width: '100%',
                                background: 'white',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                              }}
                            >
                              <div
                                key={`${mapInteractiveSrc}|${isXs ? 'xs' : 'lg'}|${mainStageView}`}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  overflow: 'hidden',
                                }}
                              >
                                <div
                                  style={{
                                    transform: `scale(${staticSvgScale})`,
                                    transformOrigin: 'center center',
                                    transition: 'transform 120ms ease-out',
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {content}
                                </div>
                              </div>
                            </div>
                          )}
                        />
                      </div>
                    ) : rasterMapSrc ? (
                      <div className={styles.mapStaticInner}>
                        <img
                          key={`${rasterMapSrc}|${isXs ? 'xs' : 'lg'}`}
                          src={rasterMapSrc}
                          alt={`Mapa visual de ${nombre}`}
                          onLoad={handleRasterMapLoad}
                        />
                      </div>
                    ) : (
                      <div className={styles.mapStaticInner}>
                        <div className={styles.mapVisualPlaceholder}>Mapa del evento</div>
                      </div>
                    )}

                    {mainStageView === 'mapa' ? (
                      <>
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
                      </>
                    ) : null}
                  </div>
                </div>

                <div className={styles.pricePanel}>
                  <div
                    className={styles.zoneTabsWrap}
                    data-overflow={zoneTabsOverflow ? 'true' : 'false'}
                  >
                    <button
                      type="button"
                      className={styles.zoneTabChevron}
                      aria-label="Ver zonas anteriores"
                      disabled={!zoneTabsOverflow || zoneTabsScrollEdge.start}
                      onClick={() => scrollZoneTabs(-1)}
                    >
                      ‹
                    </button>
                    <div
                      ref={zoneTabsRef}
                      className={styles.zoneTabs}
                      role="tablist"
                      aria-label="Filtrar por zona"
                      onScroll={updateZoneTabsScrollState}
                    >
                      {zoneTabs.map((tab) => {
                        const label = tab === 'ALL' ? 'Todas' : tab.replaceAll('_', ' ');
                        const isOn = localityFilterTab === tab;
                        return (
                          <button
                            key={tab}
                            type="button"
                            role="tab"
                            aria-selected={isOn}
                            className={isOn ? styles.zoneTabOn : styles.zoneTab}
                            onClick={() => setLocalityFilterTab(tab)}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      className={styles.zoneTabChevron}
                      aria-label="Ver más zonas"
                      disabled={!zoneTabsOverflow || zoneTabsScrollEdge.end}
                      onClick={() => scrollZoneTabs(1)}
                    >
                      ›
                    </button>
                  </div>
                  <div className={styles.priceRowsScroll}>{filteredLocalityRows.map((row) => renderZoneCard(row))}</div>

                  {selectedRow ? (
                    <div className={styles.qtyGlobal}>
                      <div className={styles.qtyGlobalTitle}>Cantidad de boletos</div>
                      <div className={styles.qtyGlobalRow}>
                        <button
                          type="button"
                          className={styles.qtyGlobalBtn}
                          onClick={() =>
                            changeQty(
                              selectedRow.name,
                              Number(selectedQtyByLocality[selectedRow.name] || 0) - 1,
                              selectedRow.available,
                            )
                          }
                          disabled={Number(selectedQtyByLocality[selectedRow.name] || 0) <= 0}
                          aria-label="Menos"
                        >
                          −
                        </button>
                        <span className={styles.qtyGlobalValue}>
                          {Number(selectedQtyByLocality[selectedRow.name] || 0)}
                        </span>
                        <button
                          type="button"
                          className={styles.qtyGlobalBtn}
                          onClick={() =>
                            changeQty(
                              selectedRow.name,
                              Number(selectedQtyByLocality[selectedRow.name] || 0) + 1,
                              selectedRow.available,
                            )
                          }
                          disabled={
                            selectedRow.available <= Number(selectedQtyByLocality[selectedRow.name] || 0) ||
                            Number(selectedQtyByLocality[selectedRow.name] || 0) >= MAX_TICKETS_PER_PERSON
                          }
                          aria-label="Más"
                        >
                          +
                        </button>
                      </div>
                      <p className={styles.qtyGlobalNote}>
                        máx. {Math.min(MAX_TICKETS_PER_PERSON, selectedRow.available)} por persona ·{' '}
                        {selectedRow.name.replaceAll('_', ' ')}
                      </p>
                    </div>
                  ) : null}

                  <div className={styles.selectedSeatsBox}>
                    <div className={styles.selectedSeatsTitle}>Asientos seleccionados</div>
                    {totalTickets <= 0 ? (
                      <p className={styles.selectedSeatsPlaceholder}>
                        Selecciona asientos en el mapa o cantidades por zona.
                      </p>
                    ) : (
                      <ul className={styles.selectedSeatsList}>
                        {localityRows
                          .filter((r) => Number(selectedQtyByLocality[r.name] || 0) > 0)
                          .map((r) => (
                            <li key={`sel-${r.name}`}>
                              <span>{r.name.replaceAll('_', ' ')}</span>
                              <span>
                                × {selectedQtyByLocality[r.name]} · Q{' '}
                                {(r.price * Number(selectedQtyByLocality[r.name] || 0)).toLocaleString('es-GT', {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            </li>
                          ))}
                      </ul>
                    )}
                    {activeSeatCode && seatByCode.get(activeSeatCode) ? (
                      <p className={styles.lastSeatHint}>
                        Último en mapa: {seatByCode.get(activeSeatCode)?.nombre || `Código ${activeSeatCode}`}
                      </p>
                    ) : null}
                  </div>

                  <div className={styles.checkoutFooter}>
                    <div className={styles.checkoutTotal}>
                      <span>Total</span>
                      <strong>Q {totalAmount.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div className={styles.expiryBar} role="status" aria-live="polite">
                      <span className={styles.expiryLabel}>Tu selección expira en</span>
                      <span className={styles.expiryTime}>{formatSecondsMMSS(secondsLeft)}</span>
                    </div>
                    <div className={styles.checkoutActions}>
                      <button
                        type="button"
                        className={styles.payBtn}
                        disabled={totalTickets <= 0 || secondsLeft <= 0 || reserving}
                        onClick={() => {
                          void reserveAndCheckout();
                        }}
                      >
                        {reserving ? 'Reservando...' : 'Ir a pagar'}
                      </button>
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

function findSeatSvgElementByCode(svg: SVGSVGElement, code: number): SVGGraphicsElement | null {
  const only = String(Math.floor(code));
  const candidates = [`a_${only}`, `a${only}`, `c_${only}`, `c${only}`, `svg_${only}`, `svg${only}`];
  for (const id of candidates) {
    try {
      const el = svg.querySelector(`#${CSS.escape(id)}`);
      if (el instanceof SVGGraphicsElement) return el;
    } catch {
      /* id inválido para selector */
    }
  }
  return null;
}

function resolveSeatDisplayMeta(
  svg: SVGSVGElement | null,
  seatCode: number | undefined,
  hoveredEl?: Element | null,
): { mesa: string; silla: string; label: string } {
  const read = (el: Element | null | undefined) => {
    if (!el) return { mesa: '', silla: '', label: '' };
    const mesa = (el.getAttribute('data-primetix-mesa') || '').trim();
    const silla = (el.getAttribute('data-primetix-silla') || '').trim();
    const label = (el.getAttribute('data-primetix-seat-label') || '').trim();
    return { mesa, silla, label };
  };

  // 1) Prioriza nodo hover real (o su ancestro con data-primetix-*).
  const fromHover =
    (hoveredEl && 'closest' in hoveredEl
      ? hoveredEl.closest('[data-primetix-mesa][data-primetix-silla], [data-primetix-seat-label]')
      : null) || null;
  const hoverMeta = read(fromHover);
  if ((hoverMeta.mesa && hoverMeta.silla) || hoverMeta.label) return hoverMeta;

  // 2) Fallback: nodo de asiento resuelto por código/id.
  if (!svg || !Number.isFinite(seatCode)) return { mesa: '', silla: '', label: '' };
  const seatEl = findSeatSvgElementByCode(svg, Number(seatCode));
  const codeMeta = read(seatEl);
  if ((codeMeta.mesa && codeMeta.silla) || codeMeta.label) return codeMeta;
  return { mesa: '', silla: '', label: '' };
}

function hexToCssMarker(hex?: string): string {
  const t = (hex || '').trim();
  if (!t) return '#3dd87a';
  return t.startsWith('#') ? t : `#${t}`;
}

/** En compra rápida, colores por zona aplican a localidades cuyo nombre indica mesa o silla (datos reales del API). */
function localityEsMesaOSilla(name: string): boolean {
  const n = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
  return n.includes('MESA') || n.includes('SILLA');
}

function formatReservaHeroLine(iso: string, ubicacion: string): string {
  if (!iso) return (ubicacion || '').trim() || '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return [iso, ubicacion].filter(Boolean).join(' · ');
    const datePart = new Intl.DateTimeFormat('es-GT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
    const timePart = new Intl.DateTimeFormat('es-GT', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
    const u = (ubicacion || '').trim();
    return [datePart, `${timePart} hrs`, u].filter(Boolean).join(' · ');
  } catch {
    return ubicacion || iso;
  }
}

function safeDecode(v: string | undefined): string {
  if (!v) return '';
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

/** Mismo parser del Booking legacy para ids de asiento en SVG. */
function seatCodeFromElementId(rawId: string | null | undefined): number | null {
  const clean = (rawId || '').trim();
  if (!clean) return null;
  const patterns = [/^a_?(\d+)$/i, /^c_?(\d+)$/i, /^svg_?(\d+)$/i, /^(\d+)$/];
  for (const p of patterns) {
    const m = clean.match(p);
    if (m) return Number(m[1]);
  }
  return null;
}

function isSeatElementId(rawId: string | null | undefined): boolean {
  return seatCodeFromElementId(rawId) != null;
}

function getClosestElementId(target: EventTarget | null): string {
  if (!(target instanceof Element)) return '';
  if (target.id) return target.id;
  const closest = target.closest('[id]');
  return (closest as Element | null)?.id || '';
}

function getClosestInteractiveElementId(target: EventTarget | null, seatsPie: SeatMapPie[] | null | undefined): string {
  if (!(target instanceof Element)) return '';
  const isPieId = (id: string) =>
    Array.isArray(seatsPie) && seatsPie.some((s) => s?.nombreLocalidad === id || s?.nombreSector === id);
  let current: Element | null = target;
  while (current) {
    const id = current.getAttribute('id') || '';
    // Igual que Booking: solo ids de asiento o de pie (no m*/g* para evitar tomar "primer asiento del grupo").
    if (id && (isSeatElementId(id) || isPieId(id))) return id;
    current = current.parentElement;
  }
  return '';
}

/**
 * Resuelve clic/hover del mapa a un código de asiento del API.
 * Mesas en SVG: overlay `m{n}` y grupo `g{n}` con hijos `a_*` / `c_*` (mismo criterio que Booking).
 */
function resolveMapElementToSeatCode(svg: SVGSVGElement | null, elementId: string): number | null {
  const id = elementId.trim();
  if (!id) return null;

  const direct = seatCodeFromElementId(id);
  if (direct != null) return direct;

  if (!svg) return null;

  const mesaNum = id.match(/^m(\d+)$/i)?.[1];
  if (mesaNum) {
    const grupo = svg.getElementById(`g${mesaNum}`);
    if (grupo) {
      for (const el of grupo.querySelectorAll('[id]')) {
        const c = seatCodeFromElementId(el.id);
        if (c != null) return c;
      }
    }
    return null;
  }

  const grupoNum = id.match(/^g(\d+)$/i)?.[1];
  if (grupoNum) {
    const grupo = svg.getElementById(`g${grupoNum}`);
    if (grupo) {
      for (const el of grupo.querySelectorAll('[id]')) {
        const c = seatCodeFromElementId(el.id);
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
