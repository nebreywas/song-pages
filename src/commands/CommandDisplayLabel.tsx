import './commandDisplayLabel.css';

const KUDO_LABEL_PREFIX = 'Kudo:';

type CommandDisplayLabelProps = {
  label: string;
};

/**
 * Key bindings UI — Kudo rows read as "Kudo:" + preset name; de-emphasize the name slightly.
 */
export function CommandDisplayLabel({ label }: CommandDisplayLabelProps) {
  if (!label.startsWith(`${KUDO_LABEL_PREFIX} `)) {
    return <>{label}</>;
  }

  const presetName = label.slice(KUDO_LABEL_PREFIX.length + 1);
  return (
    <>
      <span className="command-kudo-prefix">{KUDO_LABEL_PREFIX}</span>{' '}
      <span className="command-kudo-suffix">{presetName}</span>
    </>
  );
}
