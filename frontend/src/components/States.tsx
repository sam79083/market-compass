export function LoadingSkeleton() {
  return (
    <div className="skeleton-layout" aria-label="Loading dashboard">
      <div className="skeleton skeleton-hero" />
      <div className="skeleton-row">
        <div className="skeleton skeleton-category" />
        <div className="skeleton skeleton-category" />
        <div className="skeleton skeleton-category" />
        <div className="skeleton skeleton-category" />
      </div>
      <div className="skeleton skeleton-chart" />
      <div className="skeleton-row">
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </div>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="state-panel">
      <div className="state-icon">!</div>
      <h2>Could not load market data</h2>
      <p>{message}</p>
      <p className="state-hint">
        Check that the FastAPI service is running, or that the static snapshots exist and{" "}
        <code>VITE_DATA_MODE</code> is set correctly.
      </p>
      <button className="primary-button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="state-panel state-panel-wide">
      <div className="eyebrow">No observations yet</div>
      <h2>The data store is connected, but it is empty.</h2>
      <p>
        Run the ingestion and scoring pipeline once. It downloads public market data, computes
        point-in-time percentiles, and writes the dashboard tables.
      </p>
      <div className="command-grid">
        <div>
          <span className="command-label">Windows (from the repository root)</span>
          <pre>
            <code>cd backend{"\n"}..\.venv\Scripts\python -m app.cli refresh --validate</code>
          </pre>
        </div>
        <div>
          <span className="command-label">macOS / Linux</span>
          <pre>
            <code>cd backend{"\n"}../.venv/bin/python -m app.cli refresh --validate</code>
          </pre>
        </div>
      </div>
      <p className="state-hint">
        For a static deployment, run <code>python -m app.cli export-static</code> after the refresh.
        The API and the refresh job must read the same data store.
      </p>
      <p className="state-hint">
        The dashboard does not fabricate a classification when data is missing. Forward P/E and CNN
        Fear &amp; Greed remain unavailable until an authorized feed is configured.
      </p>
    </div>
  );
}
