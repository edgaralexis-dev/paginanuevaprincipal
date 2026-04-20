import type { ReactNode } from 'react';
import { Component } from 'react';

type Props = { children: ReactNode };
type State = { error?: Error };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error('UI crashed:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'DM Sans, sans-serif', background: '#0a0a0a', color: '#f5f2ed', minHeight: '100vh' }}>
          <h2 style={{ margin: 0 }}>Error en la página</h2>
          <p style={{ opacity: 0.8 }}>
            Se produjo un error de JavaScript y React no pudo renderizar. Copia este mensaje.
          </p>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, background: '#111', padding: 12, borderRadius: 8 }}>
            {String(this.state.error?.stack || this.state.error?.message)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

