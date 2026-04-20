import { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import styles from '../SitePage/sitePage.module.css';

export default function ContactPage() {
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const nombre = String(data.get('nombre') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();
    const mensaje = String(data.get('mensaje') ?? '').trim();
    const subject = encodeURIComponent(`Contacto Primetix — ${nombre || 'Usuario'}`);
    const body = encodeURIComponent(
      `Nombre: ${nombre}\nCorreo: ${email}\n\nMensaje:\n${mensaje}`,
    );
    window.location.href = `mailto:soporte@primetix.fun?subject=${subject}&body=${body}`;
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Link to="/" className={styles.back}>
          ← Volver al inicio
        </Link>
        <h1 className={styles.title}>Contacto</h1>
        <p className={styles.lead}>
          Escríbenos por el formulario o abre tu correo para enviarnos un mensaje directo. Estamos para ayudarte con compras,
          transferencias y soporte general.
        </p>
        <form className={styles.form} onSubmit={onSubmit}>
          <label className={styles.label}>
            Nombre
            <input className={styles.input} name="nombre" type="text" autoComplete="name" required />
          </label>
          <label className={styles.label}>
            Correo
            <input className={styles.input} name="email" type="email" autoComplete="email" required />
          </label>
          <label className={styles.label}>
            Mensaje
            <textarea className={styles.textarea} name="mensaje" required />
          </label>
          <button type="submit" className={styles.submit}>
            Abrir correo
          </button>
          <p className={styles.hint}>
            Equivale al flujo de contacto del portal: el envío final lo gestiona tu aplicación de correo (mailto). Más adelante se
            puede enlazar al mismo endpoint que usa paginaprincipal.
          </p>
        </form>
      </div>
    </div>
  );
}
