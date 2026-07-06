/** Simple labeled control row — reset/clear affordances deferred until UI pass is done. */
export function AssignmentField({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`vc-assignment-field${className ? ` ${className}` : ''}`}>
      <span className="vc-assignment-field-label">{label}</span>
      {children}
    </div>
  );
}
