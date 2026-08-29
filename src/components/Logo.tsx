export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="logo" aria-label="Creatorly">
      <span className="logo-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      {compact ? null : <span>Creatorly</span>}
    </span>
  );
}
