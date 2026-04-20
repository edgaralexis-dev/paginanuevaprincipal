import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { generatePassword, getUser, loginPrimetix } from '../../services/session';
import type { User } from '../../types/user';
import { ChevronRight, Mail } from 'lucide-react';
import WhatsAppIcon from '../../components/icons/WhatsAppIcon';
import logoSrc from '../../assets/LogoPrimetix.svg';
import styles from './login.module.css';

type Paso = 0 | 1 | 2;
type Verificacion = 'correo' | 'numero' | '';

const mailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawRedirect = searchParams.get('redirect') || '/';
  const redirect =
    rawRedirect.startsWith('/login') || !rawRedirect.startsWith('/') ? '/' : rawRedirect;
  const { setUser } = useAuth();

  const uuid = useMemo(() => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`), []);

  const [paso, setPaso] = useState<Paso>(0);
  const [verificacion, setVerificacion] = useState<Verificacion>('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goBack = () => {
    setError(null);
    if (paso === 2) {
      setPaso(1);
      setToken('');
    } else if (paso === 1) {
      setPaso(0);
      setEmail('');
      setPhone('');
    } else {
      navigate(-1);
    }
  };

  const enviarCodigo = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (verificacion === 'correo') {
      if (!email.trim()) {
        setError('Ingresa tu correo electrónico');
        return;
      }
      if (!mailRe.test(email.trim())) {
        setError('Correo no válido');
        return;
      }
    } else if (verificacion === 'numero') {
      if (!phone.trim()) {
        setError('Ingresa tu número de WhatsApp');
        return;
      }
    }
    setLoading(true);
    try {
      const u = await getUser(verificacion === 'correo' ? email : undefined, verificacion === 'numero' ? phone : undefined);
      if (!u) {
        setError(
          verificacion === 'correo' ? 'Este correo no está registrado' : 'Este número no está registrado',
        );
        setLoading(false);
        return;
      }
      if (u.activo === 'P') {
        setError('Tu cuenta aún no ha sido validada');
        setLoading(false);
        return;
      }
      const resp = await generatePassword(
        verificacion === 'correo' ? email : undefined,
        verificacion === 'numero' ? phone : undefined,
      );
      if (!resp || Object.keys(resp).length === 0) {
        setError('No se pudo enviar el código. Intenta de nuevo.');
        setLoading(false);
        return;
      }
      setPaso(2);
    } catch {
      setError('Error de conexión. Revisa tu red e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const validarLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token.trim()) {
      setError('Ingresa el código que recibiste');
      return;
    }
    setLoading(true);
    try {
      const res = await loginPrimetix(
        verificacion === 'correo' ? email : undefined,
        token.trim(),
        uuid,
        verificacion === 'numero' ? phone : undefined,
      );
      if (res.intentosLogin !== undefined && res.intentosLogin >= 3) {
        setError('Demasiados intentos. Espera unos minutos.');
        setLoading(false);
        return;
      }
      if (!res.success || !res.user) {
        setError(res.message || 'Código incorrecto');
        setLoading(false);
        return;
      }
      const u: User = normalizeUser(res.user);
      setUser(u);
      navigate(redirect.startsWith('/') ? redirect : '/', { replace: true });
    } catch {
      setError('No se pudo validar el código.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${styles.page} ${styles.pageLogin}`}>
      <div className={styles.header}>
        <button type="button" className={styles.back} onClick={goBack}>
          ← Volver
        </button>
        <Link to="/" className={styles.logoLink}>
          <img src={logoSrc} alt="Primetix" style={{ height: 26 }} />
        </Link>
        <span style={{ width: 56 }} />
      </div>

      <div className={`${styles.card} ${paso === 0 ? styles.cardChoice : ''}`}>
        {paso === 0 && (
          <>
            <div className={styles.choiceHeader}>
              <span className={styles.stepPill}>Paso 1 de 3</span>
              <h1 className={styles.title}>Iniciar sesión</h1>
              <p className={styles.subLead}>
                Accede con un código de un solo uso. Elige el canal donde quieres recibirlo.
              </p>
            </div>

            <div className={styles.choiceList} role="group" aria-label="Canal para el código">
              <button
                type="button"
                className={styles.methodCard}
                onClick={() => {
                  setVerificacion('numero');
                  setPaso(1);
                }}
              >
                <div className={`${styles.methodIcon} ${styles.methodIconWa}`} aria-hidden>
                  <WhatsAppIcon size={24} className={styles.waGlyph} />
                </div>
                <div className={styles.methodBody}>
                  <span className={styles.methodTitle}>WhatsApp</span>
                  <span className={styles.methodHint}>Código al instante en tu número</span>
                </div>
                <ChevronRight className={styles.methodChevron} size={20} strokeWidth={1.75} aria-hidden />
              </button>

              <button
                type="button"
                className={styles.methodCard}
                onClick={() => {
                  setVerificacion('correo');
                  setPaso(1);
                }}
              >
                <div className={`${styles.methodIcon} ${styles.methodIconMail}`} aria-hidden>
                  <Mail size={22} strokeWidth={1.85} />
                </div>
                <div className={styles.methodBody}>
                  <span className={styles.methodTitle}>Correo electrónico</span>
                  <span className={styles.methodHint}>Recibe el código en tu bandeja de entrada</span>
                </div>
                <ChevronRight className={styles.methodChevron} size={20} strokeWidth={1.75} aria-hidden />
              </button>
            </div>
          </>
        )}

        {paso === 1 && (
          <form onSubmit={enviarCodigo}>
            <h1 className={styles.title}>Iniciar sesión</h1>
            <p className={styles.sub}>
              {verificacion === 'correo'
                ? 'Te enviaremos un código a tu correo.'
                : 'Te enviaremos un código por WhatsApp.'}
            </p>
            {verificacion === 'correo' ? (
              <>
                <label className={styles.label} htmlFor="email">
                  Correo
                </label>
                <input
                  id="email"
                  className={styles.input}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </>
            ) : (
              <>
                <label className={styles.label} htmlFor="phone">
                  Número (incluye código de país)
                </label>
                <input
                  id="phone"
                  className={styles.input}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="Ej. 50212345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </>
            )}
            {error ? <div className={styles.error}>{error}</div> : null}
            <button type="submit" className={styles.primary} disabled={loading}>
              {loading ? 'Enviando…' : 'Enviar código'}
            </button>
          </form>
        )}

        {paso === 2 && (
          <form onSubmit={validarLogin}>
            <h1 className={styles.title}>Código de verificación</h1>
            <p className={styles.sub}>
              Ingresa el código que recibiste en {verificacion === 'correo' ? 'tu correo' : 'WhatsApp'}.
            </p>
            <label className={styles.label} htmlFor="code">
              Código
            </label>
            <input
              id="code"
              className={styles.input}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            {error ? <div className={styles.error}>{error}</div> : null}
            <button type="submit" className={styles.primary} disabled={loading}>
              {loading ? 'Validando…' : 'Iniciar sesión'}
            </button>
            <button
              type="button"
              className={styles.ghost}
              disabled={loading}
              onClick={async () => {
                setError(null);
                setLoading(true);
                try {
                  const resp = await generatePassword(
                    verificacion === 'correo' ? email : undefined,
                    verificacion === 'numero' ? phone : undefined,
                  );
                  if (!resp || Object.keys(resp).length === 0) {
                    setError('No se pudo reenviar el código.');
                  }
                } finally {
                  setLoading(false);
                }
              }}
            >
              Reenviar código
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function normalizeUser(raw: User): User {
  return {
    codigo: raw.codigo,
    codigoPromotor: raw.codigoPromotor ?? null,
    nombre: raw.nombre ?? '',
    usuario1: raw.usuario1 ?? '',
    correoElectronico: raw.correoElectronico ?? '',
    numeroCelular: raw.numeroCelular ?? '',
    tokenPrivado: raw.tokenPrivado,
    activo: raw.activo ?? 'A',
    codigoRol: raw.codigoRol ?? 0,
    rol: raw.rol ?? '',
    estadoRol: raw.estadoRol ?? '',
    inicioSesion: raw.inicioSesion ?? '',
    finalSesion: raw.finalSesion ?? '',
    correoVerificado: raw.correoVerificado ?? false,
    paginasAcceso: raw.paginasAcceso ?? [],
    rols: raw.rols ?? [],
  };
}
