import { useEffect } from 'react';

export default function RedirectAndClosePage() {
  useEffect(() => {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        {
          type: 'PAYMENT_SUCCESS',
          timestamp: new Date().toISOString(),
        },
        window.location.origin,
      );
    }
    const t = window.setTimeout(() => window.close(), 800);
    return () => window.clearTimeout(t);
  }, []);

  const closeNow = () => {
    window.open('', '_self');
    window.close();
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #101014, #181b21)',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          background: 'rgba(255,255,255,.08)',
          padding: 24,
          borderRadius: 16,
          textAlign: 'center',
          color: 'white',
          border: '1px solid rgba(255,255,255,.12)',
        }}
      >
        <h2 style={{ margin: 0, fontSize: 22 }}>Pago completado</h2>
        <p style={{ fontSize: 14, marginTop: 12, opacity: 0.9 }}>
          Cierra esta pestaña para volver al sitio principal.
        </p>
        <button
          onClick={closeNow}
          style={{
            marginTop: 16,
            padding: '12px 20px',
            fontSize: 15,
            fontWeight: 700,
            backgroundColor: '#3dd87a',
            color: '#0a0a0a',
            border: 'none',
            borderRadius: 10,
            cursor: 'pointer',
          }}
        >
          Cerrar esta pestaña
        </button>
      </div>
    </div>
  );
}
