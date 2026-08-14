import { useRef, useState } from 'react';
import { Commitments } from '../features/landing/Commitments';
import { DeepStory } from '../features/landing/DeepStory';
import { HeroCompact } from '../features/landing/HeroCompact';
import { HeroDawn } from '../features/landing/HeroDawn';
import { HowItWorks } from '../features/landing/HowItWorks';
import { MatchesSection } from '../features/landing/MatchesSection';
import { ReassuranceStrip } from '../features/landing/ReassuranceStrip';
import { useChatUi } from '../features/chat/FloatingChat';
import { useDemoFlow } from '../lib/demoFlow';

/**
 * Landing — "Morning Water". One day at Inya Lake: dawn hero, a quiet
 * proof strip, the deep-water conversation storyboard, matches, the path,
 * and a dusk close. The hero input is the page's single AI entry point.
 */
export default function Landing() {
  const { startFromInput } = useDemoFlow();
  const { setOpen } = useChatUi();
  const [goal, setGoal] = useState('');
  // Two hero variants stay mounted at once (CSS-swapped by breakpoint), so
  // each needs its own ref — a shared one would only ever track whichever
  // rendered last, breaking focus/scroll on the other breakpoint.
  const heroRefCompact = useRef<HTMLDivElement>(null);
  const heroRefDawn = useRef<HTMLDivElement>(null);

  function activeHeroRef() {
    return heroRefCompact.current?.offsetParent !== null
      ? heroRefCompact
      : heroRefDawn;
  }

  function submitGoal(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setGoal('');
    startFromInput(trimmed);
    setOpen(true);
  }

  function focusInput() {
    activeHeroRef()
      .current?.querySelector<HTMLTextAreaElement>('textarea')
      ?.focus({ preventScroll: true });
  }

  function applyChip(text: string) {
    submitGoal(text);
  }

  function backToInput() {
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    activeHeroRef().current?.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'center',
    });
    focusInput();
  }

  return (
    <div>
      <div className="md:hidden">
        <HeroCompact
          goal={goal}
          onGoalChange={setGoal}
          onSubmit={() => submitGoal(goal)}
          onChip={applyChip}
          heroRef={heroRefCompact}
        />
      </div>
      <div className="hidden md:block">
        <HeroDawn
          goal={goal}
          onGoalChange={setGoal}
          onSubmit={() => submitGoal(goal)}
          onChip={applyChip}
          heroRef={heroRefDawn}
        />
      </div>
      <ReassuranceStrip />
      <DeepStory onStart={backToInput} />
      <MatchesSection />
      <HowItWorks />
      <Commitments />
    </div>
  );
}
