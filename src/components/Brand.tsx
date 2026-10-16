
type BrandProps = {
  className?: string;
  wipe?: boolean;
};

/** "Legends" is the only red word in the brand name,
 * except on the page wipe, where it is black.
 */
export default function Brand({
  className,
  wipe = false,
}: BrandProps) {
  return (
    <span className={className}>
      THE{" "}
      <span className={wipe ? undefined : "red"}
        style={wipe ? { color: "#000000" } : undefined}
      >
        LEGENDS
      </span>{" "}
      FITNESS
    </span>
  );
}
