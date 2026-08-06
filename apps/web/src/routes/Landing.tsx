import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Commitments } from '../features/landing/Commitments';
import { DeepStory } from '../features/landing/DeepStory';
import { HeroDawn } from '../features/landing/HeroDawn';
import { HowItWorks } from '../features/landing/HowItWorks';
import { MatchesSection } from '../features/landing/MatchesSection';
import { ReassuranceStrip } from '../features/landing/ReassuranceStrip';
import { useDemoFlow } from '../lib/demoFlow';

/**
 * Landing — "Morning Water". One day at Inya Lake: dawn hero, a quiet
 * proof strip, the deep-water conversation storyboard, matches, the path,
 * and a dusk close. The hero input is the page's single AI entry point.
 */
export default function Landing() {
  const navigate = useNavigate();
  const { startQuick } = useDemoFlow();
  const [goal, setGoal] = useState('');
  const heroRef = useRef<HTMLDivElement>(null);

  function submitGoal(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    startQuick(trimmed);
    void navigate('/converse');
  }

  function focusInput() {
    heroRef.current
      ?.querySelector<HTMLTextAreaElement>('textarea')
      ?.focus({ preventScroll: true });
  }

  function applyChip(text: string) {
    setGoal(text);
    focusInput();
  }

  function backToInput() {
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    heroRef.current?.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'center',
    });
    focusInput();
  }

  return (
    <div>
      <HeroDawn
        goal={goal}
        onGoalChange={setGoal}
        onSubmit={() => submitGoal(goal)}
        onChip={applyChip}
        heroRef={heroRef}
      />
      <ReassuranceStrip />
      <DeepStory onStart={backToInput} />
      <MatchesSection />
      <HowItWorks />
      <Commitments />
    </div>
  );
}
