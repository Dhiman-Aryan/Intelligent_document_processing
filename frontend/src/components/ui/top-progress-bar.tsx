/**
 * A slim indeterminate loading bar pinned to the top of the viewport
 * — the same visual language as YouTube's or GitHub's navigation
 * progress bar. Used when there's already real data on screen and a
 * fresh copy is being fetched quietly underneath (as opposed to the
 * skeleton screens, which are for when there's nothing to show yet).
 * Deliberately has no accompanying text — the bar alone reads as
 * "something's happening" without asking for attention the way a
 * "Fetching..." banner would.
 */
export function TopProgressBar({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 h-[3px] overflow-hidden">
      <div className="h-full w-1/4 animate-top-progress rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
    </div>
  );
}
