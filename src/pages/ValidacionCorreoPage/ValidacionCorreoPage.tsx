import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getUser, validateEmailByToken } from '../../services/session';

export default function ValidacionCorreoPage() {
  const navigate = useNavigate();
  const { correo } = useParams();
  const { user, setUser } = useAuth();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const correoToken = (correo || '').toLowerCase();
      if (!correoToken) {
        navigate('/login', { replace: true });
        return;
      }
      await validateEmailByToken(correoToken);
      if (cancelled) return;

      if (!user) {
        navigate('/login', { replace: true });
        return;
      }

      const refreshed = await getUser(correoToken);
      if (!cancelled && refreshed?.codigo) {
        setUser(refreshed);
      }
      navigate('/', { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [correo, navigate, setUser, user]);

  return null;
}
