import { LOCALE_TEXT } from "../i18n";
import type { LocaleKey } from "../i18n";

interface LocaleProps {
  locale?: LocaleKey;
}

export function LoadingSkeleton({ locale = "kr" }: LocaleProps) {
  const t = LOCALE_TEXT[locale];
  return (
    <div className="skeleton-layout" aria-label={t.loading}>
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
  locale?: LocaleKey;
}

export function ErrorState({ message, onRetry, locale = "kr" }: ErrorStateProps) {
  const t = LOCALE_TEXT[locale];
  return (
    <div className="state-panel">
      <div className="state-icon">!</div>
      <h2>{t.could_not_load_market}</h2>
      <p>{message}</p>
      <p className="state-hint">{t.check_api}</p>
      <button className="primary-button" onClick={onRetry}>
        {t.try_again}
      </button>
    </div>
  );
}

export function EmptyState({ locale = "kr" }: LocaleProps) {
  if (locale === "kr") {
    return (
      <div className="state-panel state-panel-wide">
        <div className="eyebrow">아직 관측치가 없습니다</div>
        <h2>데이터 스토어는 연결되었지만 비어 있습니다.</h2>
        <p>
          데이터 수집과 채점 파이프라인을 한 번 실행하세요. 공개 시장 데이터를 내려받고 시점별
          백분위수를 계산한 뒤 대시보드 테이블에 기록합니다.
        </p>
        <div className="command-grid">
          <div>
            <span className="command-label">Windows (저장소 루트에서)</span>
            <pre>
              <code>cd backend{"\n"}..\\.venv\\Scripts\\python -m app.cli refresh --validate</code>
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
          정적 배포라면 리프레시 후 <code>python -m app.cli export-static</code> 을 실행하세요.
          API와 리프레시 작업은 같은 데이터 스토어를 읽어야 합니다.
        </p>
        <p className="state-hint">
          데이터가 없다고 해서 등급을 임의로 만들지 않습니다. 인증 피드가 설정될 때까지 포워드
          P/E와 CNN 공포·탐욕 지수는 사용할 수 없습니다.
        </p>
      </div>
    );
  }
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
            <code>cd backend{"\n"}..\\.venv\\Scripts\\python -m app.cli refresh --validate</code>
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
