export function ComingSoonPanel({ label }: { label: string }): JSX.Element {
  return (
    <div className="flex h-full items-center justify-center p-4 text-center text-xs text-editor-text-muted">
      {label} — coming soon
    </div>
  );
}
