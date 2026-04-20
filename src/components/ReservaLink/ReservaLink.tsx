import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { incrementEventClickCount } from '../../services/events';
import { buildReservaPath } from '../../utils/reservaUrl';

type Props = {
  nombre: string;
  artista: string;
  codigo: number;
  className?: string;
  children: ReactNode;
};

/**
 * Mismo flujo que paginaprincipal (ImageList): link a Booking + hit al API.
 */
export default function ReservaLink({ nombre, artista, codigo, className, children }: Props) {
  return (
    <Link
      to={buildReservaPath(nombre, artista, codigo)}
      className={className}
      onClick={() => {
        void incrementEventClickCount(codigo);
      }}
    >
      {children}
    </Link>
  );
}
