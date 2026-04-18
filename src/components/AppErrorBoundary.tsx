import { Component, type ErrorInfo, type ReactNode } from 'react';

export type AppErrorBoundaryLayout = 'card' | 'immersive' | 'inline';

type Props = {
  children: ReactNode;
  /** Shown when a GLB / 3D load throws */
  title?: string;
  hint?: ReactNode;
  layout?: AppErrorBoundaryLayout;
};

type State = { hasError: boolean; message?: string };

const defaultTitle = '3D model could not load';

const defaultHint = (
  <p className="mt-3 text-xs leading-relaxed text-zinc-400">
    The file may be missing (404), blocked by CORS, or the URL may be wrong. If large GLBs are not in{' '}
    <code className="text-zinc-300">public/</code>, set the matching{' '}
    <code className="text-lime-200/90">PUBLIC_*</code> env vars on your host (for example Arweave HTTPS URLs)
    and redeploy.
  </p>
);

function layoutShell(layout: AppErrorBoundaryLayout, inner: ReactNode): ReactNode {
  switch (layout) {
    case 'immersive':
      return (
        <div className="flex h-full min-h-[240px] w-full flex-col items-center justify-center bg-zinc-950 px-5 py-10 text-center">
          {inner}
        </div>
      );
    case 'inline':
      return (
        <div className="flex h-full min-h-[140px] w-full flex-col items-center justify-center rounded-xl border border-amber-500/30 bg-zinc-900/95 px-3 py-4 text-center">
          {inner}
        </div>
      );
    case 'card':
    default:
      return (
        <div className="mx-auto max-w-lg rounded-2xl border border-amber-500/35 bg-zinc-900/90 px-6 py-8 text-center shadow-xl">
          {inner}
        </div>
      );
  }
}

/**
 * Catches React errors from failed GLTF loads (and other child failures) so the rest of the site
 * or chrome (nav, links) can stay up.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message };
  }

  componentDidCatch(err: Error, info: ErrorInfo): void {
    console.error('[AppErrorBoundary]', err, info.componentStack);
  }

  render(): ReactNode {
    const layout = this.props.layout ?? 'card';
    const title = this.props.title ?? defaultTitle;
    const hint = this.props.hint ?? defaultHint;

    if (this.state.hasError) {
      const body = (
        <>
          <p className="text-sm font-semibold text-amber-100/95">{title}</p>
          {hint}
          {this.state.message ? (
            <p className="mt-4 break-all font-mono text-[10px] text-zinc-600">{this.state.message}</p>
          ) : null}
          <button
            type="button"
            className="mt-6 rounded-lg border border-zinc-600 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:border-lime-500/50 hover:text-lime-100"
            onClick={() => this.setState({ hasError: false, message: undefined })}
          >
            Try again
          </button>
        </>
      );
      return layoutShell(layout, body);
    }
    return this.props.children;
  }
}
