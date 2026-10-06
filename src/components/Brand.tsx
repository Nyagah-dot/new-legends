/** "Legends" is the only red word in the brand name. */
export default function Brand({ className }: { className?: string }) {
  return (
    <span className={className}>
      THE <span className="red">LEGENDS</span> FITNESS
    </span>
  );
}
