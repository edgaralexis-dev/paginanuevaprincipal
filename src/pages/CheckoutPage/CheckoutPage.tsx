import { Link, useLocation } from 'react-router-dom';
import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import styles from '../SitePage/sitePage.module.css';
import { registerOrder, saveSaleError, type RegisterOrderPayload } from '../../services/payment';
import checkoutStyles from './checkout.module.css';
import { getEventDetailById } from '../../services/events';

export default function CheckoutPage() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const eventName = query.get('eventName') || 'Evento';
  const eventArtist = query.get('eventArtist') || 'Artista';
  const eventId = query.get('eventId') || '';
  const locality = query.get('locality') || 'Localidad general';
  const selectedRaw = query.get('selected') || '[]';
  const selectedSeatsRaw = query.get('selectedSeats') || '[]';
  const selectedItems = useMemo(() => {
    try {
      const parsed = JSON.parse(selectedRaw) as Array<{ name: string; qty: number; unitPrice: number }>;
      return Array.isArray(parsed) ? parsed.filter((x) => Number(x.qty) > 0) : [];
    } catch {
      return [];
    }
  }, [selectedRaw]);
  const selectedSeats = useMemo(() => {
    try {
      const parsed = JSON.parse(selectedSeatsRaw) as Array<{
        name?: string;
        codigoAsiento?: number;
        codigoTicket?: number;
        reventa?: boolean;
        precioUnitario?: number;
      }>;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((x) => Number(x.precioUnitario || 0) > 0);
    } catch {
      return [];
    }
  }, [selectedSeatsRaw]);
  const qtyFromItems = selectedItems.reduce((acc, x) => acc + Number(x.qty || 0), 0);
  const qtyRaw = Number(query.get('qty') || '1');
  const qty = qtyFromItems > 0 ? qtyFromItems : Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1;
  const unitPriceRaw = Number(query.get('unitPrice') || '0');
  const unitPrice = Number.isFinite(unitPriceRaw) && unitPriceRaw > 0 ? unitPriceRaw : 150;
  const subtotal =
    selectedItems.length > 0
      ? selectedItems.reduce((acc, x) => acc + Number(x.qty || 0) * Number(x.unitPrice || 0), 0)
      : qty * unitPrice;
  const fee = qty * 15;
  const discount = 0;
  const total = Math.max(0, subtotal + fee - discount);
  const loginRedirect = encodeURIComponent(`/checkout${location.search || ''}`);
  const [secondsLeft, setSecondsLeft] = useState(10 * 60);
  const [name, setName] = useState(user?.nombre || '');
  const [email, setEmail] = useState(user?.correoElectronico || '');
  const [phone, setPhone] = useState(user?.numeroCelular || '');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [checkoutInfo, setCheckoutInfo] = useState('');
  const [eventCustomAccountId, setEventCustomAccountId] = useState('');
  const checkoutDebug =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.origin.toLowerCase().includes('test');

  useEffect(() => {
    const id = window.setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setName(user?.nombre || '');
    setEmail(user?.correoElectronico || '');
    setPhone(user?.numeroCelular || '');
  }, [user?.correoElectronico, user?.nombre, user?.numeroCelular]);

  useEffect(() => {
    let cancelled = false;
    const eventCode = Number(eventId);
    if (!Number.isFinite(eventCode) || eventCode <= 0) return;
    (async () => {
      const detail = await getEventDetailById(eventCode);
      if (cancelled) return;
      const customId = String((detail as { customAccountId?: unknown } | null)?.customAccountId || '').trim();
      if (customId) setEventCustomAccountId(customId);
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const canContinue = !!user && acceptedTerms && secondsLeft > 0;
  const minutesLeft = Math.floor(secondsLeft / 60);
  const secondsRem = secondsLeft % 60;

  const ventaDetalles = useMemo(() => {
    if (selectedSeats.length > 0) {
      return selectedSeats.map((x) => ({
        codigo: 0,
        reventa: !!x.reventa,
        codigoAsiento: Number(x.codigoAsiento || 0),
        cantidad: 1,
        precioUnitario: Number(x.precioUnitario || 0),
        codigoTicket: Number(x.codigoTicket || 0),
      }));
    }
    const base = selectedItems.length > 0 ? selectedItems : [{ name: locality, qty, unitPrice }];
    return base
      .filter((x) => Number(x.qty || 0) > 0)
      .flatMap((x) =>
        Array.from({ length: Number(x.qty || 0) }).map(() => ({
          codigo: 0,
          reventa: false,
          codigoAsiento: 0,
          cantidad: 1,
          precioUnitario: Number(x.unitPrice || 0),
          codigoTicket: 0,
        })),
      );
  }, [locality, qty, selectedItems, selectedSeats, unitPrice]);

  const resolveRedirectUrl = (resp: unknown): string => {
    if (!resp || typeof resp !== 'object') return '';
    const r = resp as {
      checkout_url?: string;
      redirectUrl?: string;
      url?: string;
      pago?: { detalle?: string };
    };
    if (r.checkout_url) return r.checkout_url;
    if (r.redirectUrl) return r.redirectUrl;
    if (r.url) return r.url;
    const detail = r.pago?.detalle;
    if (!detail) return '';
    try {
      const parsed = JSON.parse(detail) as { RedirectData?: string };
      return parsed.RedirectData || '';
    } catch {
      return '';
    }
  };

  const readApiMessage = (resp: unknown): string => {
    if (!resp || typeof resp !== 'object') return '';
    const r = resp as { respuesta?: string; response?: string; message?: string };
    return String(r.respuesta || r.response || r.message || '').trim();
  };

  const classifyPaymentMessage = (msg: string): 'success' | 'pending' | 'denied' | 'auth' | 'unknown' => {
    const m = msg.toLowerCase();
    if (!m) return 'unknown';
    if (m.includes('sinjwt') || m.includes('jwt')) return 'auth';
    if (m.includes('deneg') || m.includes('rechaz') || m.includes('fall')) return 'denied';
    if (m.includes('proceso') || m.includes('pendiente')) return 'pending';
    if (m.includes('exitos') || m.includes('realizado') || m.includes('ok')) return 'success';
    return 'unknown';
  };

  /** Claves solo por entorno (nunca en el repo): GitHub bloquea push si detecta sk_/pk_ en el código. */
  const getRecurrenteKeys = (): { publicKey: string; secretKey: string } => {
    const origin = window.location.origin.toLowerCase();
    const isTest = origin.includes('test') || origin.includes('localhost');
    const publicKey = String(
      isTest
        ? import.meta.env.VITE_RECURRENTE_PUBLIC_KEY_TEST || import.meta.env.VITE_RECURRENTE_PUBLIC_KEY
        : import.meta.env.VITE_RECURRENTE_PUBLIC_KEY_LIVE || import.meta.env.VITE_RECURRENTE_PUBLIC_KEY,
    ).trim();
    const secretKey = String(
      isTest
        ? import.meta.env.VITE_RECURRENTE_SECRET_KEY_TEST || import.meta.env.VITE_RECURRENTE_SECRET_KEY
        : import.meta.env.VITE_RECURRENTE_SECRET_KEY_LIVE || import.meta.env.VITE_RECURRENTE_SECRET_KEY,
    ).trim();
    if (!publicKey || !secretKey) {
      throw new Error(
        'Faltan claves de Recurrente en el entorno. Define VITE_RECURRENTE_PUBLIC_KEY_* y VITE_RECURRENTE_SECRET_KEY_* (ver .env.example).',
      );
    }
    return { publicKey, secretKey };
  };

  const buildRecurrenteItems = () => {
    const source =
      selectedItems.length > 0
        ? selectedItems.map((x) => ({
            name: x.name,
            qty: Number(x.qty || 0),
            amount: Number(x.unitPrice || 0),
          }))
        : [{ name: locality, qty, amount: unitPrice }];
    const list = source.filter((x) => x.qty > 0 && x.amount > 0);
    return list.map((x) => ({
      name: x.name.replaceAll('_', ' '),
      currency: 'GTQ',
      amount_in_cents: Math.round(x.amount * 100),
      quantity: x.qty,
      has_dynamic_pricing: false,
    }));
  };

  const formatRecurrenteExpiry = () => {
    const msLeft = Math.max(60, secondsLeft) * 1000;
    const expiresAt = new Date(Date.now() + msLeft);
    return expiresAt.toLocaleString('sv-SE').replace(' ', 'T');
  };

  const createRecurrenteCheckoutAndRedirect = async () => {
    const { publicKey, secretKey } = getRecurrenteKeys();
    const userRes = await fetch('https://app.recurrente.com/api/users/', {
      method: 'POST',
      headers: {
        'X-PUBLIC-KEY': publicKey,
        'X-SECRET-KEY': secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.trim(),
        full_name: name.trim(),
      }),
    });
    const userData = (await userRes.json()) as { id?: string; message?: string };
    if (checkoutDebug) {
      console.log('[CHECKOUT_DEBUG] Recurrente user response', {
        ok: userRes.ok,
        status: userRes.status,
        data: userData,
      });
    }
    if (!userRes.ok || !userData?.id) {
      throw new Error(userData?.message || 'No se pudo crear usuario en Recurrente.');
    }

    const checkoutPayload: Record<string, unknown> = {
      items: buildRecurrenteItems(),
      success_url: `${window.location.origin}/registrodeventa`,
      cancel_url: `${window.location.origin}/redirect-and-close`,
      user_id: userData.id,
      expires_at: formatRecurrenteExpiry(),
      metadata: {
        eventId,
      },
    };
    const customAccountId = (query.get('customAccountId') || eventCustomAccountId || '').trim();
    const eventCode = Number(eventId || 0);
    if (customAccountId && eventCode !== 72) {
      const feeCentsLegacy =
        eventCode >= 75 ? Math.round(fee * 100) : Math.round(Math.max(0, fee * (1 - 0.045)) * 100);
      checkoutPayload.custom_account_id = customAccountId;
      checkoutPayload.transfer_setups = [
        {
          amount_in_cents: feeCentsLegacy,
        },
      ];
    }

    const checkoutRes = await fetch('https://app.recurrente.com/api/checkouts/', {
      method: 'POST',
      headers: {
        'X-PUBLIC-KEY': publicKey,
        'X-SECRET-KEY': secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(checkoutPayload),
    });
    const checkoutData = (await checkoutRes.json()) as { checkout_url?: string; message?: string };
    if (checkoutDebug) {
      console.log('[CHECKOUT_DEBUG] Recurrente checkout payload', checkoutPayload);
      console.log('[CHECKOUT_DEBUG] Recurrente checkout response', {
        ok: checkoutRes.ok,
        status: checkoutRes.status,
        data: checkoutData,
      });
    }
    if (!checkoutRes.ok || !checkoutData?.checkout_url) {
      throw new Error(checkoutData?.message || 'No se pudo generar checkout en Recurrente.');
    }
    window.location.assign(checkoutData.checkout_url);
  };

  const handlePay = async () => {
    if (!user || !canContinue || isSubmitting) return;
    if (!email.trim() || !phone.trim() || !name.trim()) {
      setCheckoutError('Completa nombre, correo y número para continuar.');
      return;
    }
    const eventCode = Number(eventId);
    if (!Number.isFinite(eventCode) || eventCode <= 0) {
      setCheckoutError('No se encontró el código del evento para crear la orden.');
      return;
    }

    setCheckoutError('');
    setCheckoutInfo('');
    setIsSubmitting(true);

    const orderBody: RegisterOrderPayload = {
      codigo: 0,
      codigoEmpresa: 1,
      codigoPago: 0,
      codigoCliente: user.codigo,
      codigoDescuento: null,
      codigoEvento: eventCode,
      descuento: discount,
      serviceFee: Number(fee.toFixed(2)),
      total: Number(total.toFixed(2)),
      estado: 'VE',
      correoElectronico: email.trim(),
      numeroCelular: phone.trim(),
      nombreCliente: name.trim(),
      codigoCanal: 1,
      tokenDescuento: '',
      idTributario: 'CF',
      nombreTributario: '',
      ventaDetalles,
    };

    try {
      if (checkoutDebug) {
        console.log('[CHECKOUT_DEBUG] Register order body', orderBody);
      }
      localStorage.setItem('bodyVenta', JSON.stringify(orderBody));
      const resp = await registerOrder(orderBody, user.tokenPrivado);
      if (checkoutDebug) {
        console.log('[CHECKOUT_DEBUG] Register order response', resp);
      }
      const apiMsg = readApiMessage(resp.data);
      const statusKind = classifyPaymentMessage(apiMsg);
      if (statusKind === 'auth') {
        logout();
        setCheckoutError('Tu sesión expiró. Inicia sesión nuevamente para continuar.');
        return;
      }
      if (!resp.ok || statusKind === 'denied' || statusKind === 'unknown') {
        const dump = JSON.stringify({ status: resp.status, data: resp.data, body: orderBody });
        await saveSaleError(0, dump);
        setCheckoutError(apiMsg || 'No se pudo registrar la orden. Intenta nuevamente.');
        return;
      }

      const redirectUrl = resolveRedirectUrl(resp.data);
      if (redirectUrl) {
        window.location.assign(redirectUrl);
        return;
      }

      if (statusKind === 'pending') {
        setCheckoutInfo(apiMsg || 'Tu pago está en proceso de confirmación.');
        return;
      }

      await createRecurrenteCheckoutAndRedirect();
    } catch (error) {
      if (checkoutDebug) {
        console.error('[CHECKOUT_DEBUG] Checkout flow error', error);
      }
      await saveSaleError(0, JSON.stringify({ body: orderBody, error: String(error) }));
      setCheckoutError('Ocurrió un error al crear la orden. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner} style={{ maxWidth: 980 }}>
        <Link to="/" className={styles.back}>
          ← Volver al inicio
        </Link>
        <h1 className={styles.title} style={{ color: '#eaf2ff' }}>
          Checkout
        </h1>
        <p className={styles.lead} style={{ color: '#b4c3d5' }}>
          Tiempo restante: {minutesLeft}:{String(secondsRem).padStart(2, '0')} min
        </p>
        <div className={checkoutStyles.wrap}>
          <div className={checkoutStyles.delivery}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 26 }}>Entrega</p>
            <p style={{ margin: '4px 0', color: '#43d9ab', fontWeight: 700 }}>Móvil - gratis</p>
            <p style={{ margin: 0, color: '#9fb0c4', fontSize: 13 }}>
              Tu celular es tu ticket. Tus tickets se notificarán automáticamente a tu correo electrónico.
            </p>
          </div>
          <div className={checkoutStyles.grid}>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 18 }}>
                {eventName} · {eventArtist}
              </p>
              <p style={{ marginTop: 6, color: '#9fb0c4' }}>Código: {eventId || 'N/D'}</p>
              <p style={{ marginTop: 4, color: '#9fb0c4' }}>Localidad: {locality.replaceAll('_', ' ')}</p>
              <div style={{ marginTop: 12, borderTop: '1px solid #223245', paddingTop: 12 }}>
                <p style={{ margin: 0, fontSize: 12, color: '#86a0bd', textTransform: 'uppercase' }}>
                  Detalle de compra
                </p>
                {selectedItems.length > 0 ? (
                  <div style={{ marginTop: 8 }}>
                    {selectedItems.map((it) => (
                      <div key={it.name} style={{ marginBottom: 10, color: '#dce7f4' }}>
                        <p style={{ margin: '2px 0', fontWeight: 700 }}>{it.name.replaceAll('_', ' ')}</p>
                        <p style={{ margin: '2px 0' }}>
                          Precio: Q{' '}
                          {Number(it.unitPrice || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                        </p>
                        <p style={{ margin: '2px 0' }}>Fee: Q 15.00</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ marginTop: 8, color: '#dce7f4' }}>
                    {locality.replaceAll('_', ' ')} · {qty} x Q{' '}
                    {Number(unitPrice).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            </div>

            <div
              className={checkoutStyles.summaryCard}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#eaf2ff', fontWeight: 700 }}>Total:</span>
                <strong>Q {total.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#eaf2ff', fontWeight: 700 }}>Descuento:</span>
                <strong>Q {discount.toFixed(2)}</strong>
              </div>
              <div className={checkoutStyles.separator} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#aabbd0' }}>Boletos</span>
                <strong>{qty}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#aabbd0' }}>Subtotal</span>
                <strong>Q {subtotal.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#aabbd0' }}>Cargo por servicio</span>
                <strong>Q {fee.toFixed(2)}</strong>
              </div>
              <div className={checkoutStyles.separator} />

              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre *"
                className={checkoutStyles.field}
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Correo *"
                className={checkoutStyles.field}
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Número *"
                className={checkoutStyles.field}
              />

              <label className={checkoutStyles.terms}>
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                />
                <span>
                  Acepto <a href="#" style={{ color: '#57b6ff' }}>términos y condiciones de uso</a>
                </span>
              </label>

              {!user ? (
                <Link
                  to={`/login?redirect=${loginRedirect}`}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '10px 12px',
                    borderRadius: 8,
                    textDecoration: 'none',
                    background: 'linear-gradient(135deg, #36d399 0%, #34c77f 100%)',
                    color: '#062312',
                    fontWeight: 700,
                  }}
                >
                  Iniciar sesión y continuar
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handlePay}
                  disabled={!canContinue || isSubmitting}
                  className={`${checkoutStyles.cta} ${
                    canContinue && !isSubmitting ? checkoutStyles.ctaEnabled : checkoutStyles.ctaDisabled
                  }`}
                >
                  {isSubmitting ? 'Creando orden...' : 'Ir a pagar'}
                </button>
              )}
              {!user ? (
                <p style={{ marginTop: 8, fontSize: 12, color: '#8a1c1c' }}>
                  Debes iniciar sesión para completar el pago.
                </p>
              ) : null}
              {secondsLeft <= 0 ? (
                <p style={{ marginTop: 8, fontSize: 12, color: '#8a1c1c' }}>
                  El tiempo de reserva expiró. Regresa a selección de asientos.
                </p>
              ) : null}
              {checkoutError ? (
                <p style={{ marginTop: 8, fontSize: 12, color: '#ff8d8d' }}>{checkoutError}</p>
              ) : null}
              {checkoutInfo ? (
                <p style={{ marginTop: 8, fontSize: 12, color: '#78f0bf' }}>{checkoutInfo}</p>
              ) : null}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                <span style={{ fontWeight: 700 }}>Total final</span>
                <strong style={{ color: '#eaf2ff' }}>Q {total.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

