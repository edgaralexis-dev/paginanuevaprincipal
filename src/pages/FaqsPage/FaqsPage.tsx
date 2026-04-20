import { Link, useParams } from 'react-router-dom';
import styles from '../SitePage/sitePage.module.css';

const FAQ_GENERAL = [
  {
    q: '¿Cómo compro boletos?',
    a: 'Elige un evento, selecciona localidades y completa el pago en checkout. Recibirás confirmación por correo.',
  },
  {
    q: '¿Puedo transferir mi boleto?',
    a: 'Sí, cuando el evento lo permita podrás transferir desde «Mis boletos» siguiendo las indicaciones del organizador.',
  },
  {
    q: '¿Qué es el QR dinámico?',
    a: 'Es un código que se actualiza para mayor seguridad en el ingreso al evento.',
  },
];

export default function FaqsPage() {
  const { tipo } = useParams<{ tipo: string }>();
  const label = tipo ? decodeURIComponent(tipo).replace(/-/g, ' ') : 'general';

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Link to="/" className={styles.back}>
          ← Volver al inicio
        </Link>
        <h1 className={styles.title}>Preguntas frecuentes</h1>
        <p className={styles.lead}>
          Sección <strong style={{ color: '#3dd87a' }}>{label}</strong>. En paginaprincipal esta ruta cargaba contenido dinámico
          según el tipo; aquí mostramos respuestas base mientras se integra el mismo origen de datos.
        </p>
        <ul className={styles.faqList}>
          {FAQ_GENERAL.map((item) => (
            <li key={item.q} className={styles.faqItem}>
              <div className={styles.faqQ}>{item.q}</div>
              <p className={styles.faqA}>{item.a}</p>
            </li>
          ))}
        </ul>
        <p className={styles.lead} style={{ marginTop: 28 }}>
          ¿Necesitas más ayuda?{' '}
          <Link to="/contactanos" className={styles.link}>
            Contacto
          </Link>
        </p>
      </div>
    </div>
  );
}
