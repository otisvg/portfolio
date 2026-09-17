const fullStopPattern = /(\.(?=\s|$))/g;

export function AccentPunctuation({
  children,
}: {
  children: string | null | undefined;
}) {
  if (!children) return null;

  return children.split(fullStopPattern).map((part, index) =>
    part === "." ? (
      <span className="punctuation-accent" key={`${part}-${index}`}>
        {part}
      </span>
    ) : (
      part
    ),
  );
}
