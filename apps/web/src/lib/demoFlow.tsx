import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  classifyInputShape,
  type BriefDraft,
  type ChatMessage,
  type MatchCandidate,
  type RoadmapStep,
} from '@inyalink/shared';

export type DemoPath = 'quick' | 'plan' | 'clarify';

type DemoFlowState = {
  path: DemoPath | null;
  goal: string;
  messages: ChatMessage[];
  briefDraft: BriefDraft;
  briefId: string | null;
  roadmapId: string | null;
  roadmapSteps: RoadmapStep[];
  roadmapDisclaimer: string | null;
  converseStarted: boolean;
  converseComplete: boolean;
  /** Inline match cards for the completed brief. null = not loaded yet. */
  matches: MatchCandidate[] | null;
};

type DemoFlowValue = DemoFlowState & {
  startQuick: (goal: string) => void;
  startPlan: (goal: string) => void;
  startClarify: (goal: string) => void;
  /** Classify opening text and start the matching path. Returns the route. */
  startFromInput: (goal: string) => '/converse' | '/roadmap';
  setMessages: (messages: ChatMessage[]) => void;
  setBriefDraft: (draft: BriefDraft) => void;
  setBriefId: (id: string) => void;
  markConverseStarted: () => void;
  markConverseComplete: () => void;
  setMatches: (matches: MatchCandidate[] | null) => void;
  setRoadmap: (args: {
    id: string;
    steps: RoadmapStep[];
    disclaimer: string;
  }) => void;
  /** After clarify: switch into brief conversation without resetting messages. */
  resolveClarifyToQuick: () => void;
  /** After clarify: switch into roadmap with the original goal. */
  resolveClarifyToPlan: () => void;
  reset: () => void;
};

const initial: DemoFlowState = {
  path: null,
  goal: '',
  messages: [],
  briefDraft: {},
  briefId: null,
  roadmapId: null,
  roadmapSteps: [],
  roadmapDisclaimer: null,
  converseStarted: false,
  converseComplete: false,
  matches: null,
};

const DemoFlowContext = createContext<DemoFlowValue | null>(null);

export function DemoFlowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoFlowState>(initial);

  const startQuick = useCallback((goal: string) => {
    const trimmed = goal.trim();
    setState({
      ...initial,
      path: 'quick',
      goal: trimmed,
      messages: [{ role: 'user', content: trimmed }],
    });
  }, []);

  const startPlan = useCallback((goal: string) => {
    setState({
      ...initial,
      path: 'plan',
      goal: goal.trim(),
    });
  }, []);

  const startClarify = useCallback((goal: string) => {
    const trimmed = goal.trim();
    setState({
      ...initial,
      path: 'clarify',
      goal: trimmed,
      messages: [{ role: 'user', content: trimmed }],
      converseStarted: true,
    });
  }, []);

  const startFromInput = useCallback(
    (goal: string): '/converse' | '/roadmap' => {
      const trimmed = goal.trim();
      const shape = classifyInputShape(trimmed);
      if (shape === 'goal') {
        startPlan(trimmed);
        return '/roadmap';
      }
      if (shape === 'service') {
        startQuick(trimmed);
        return '/converse';
      }
      startClarify(trimmed);
      return '/converse';
    },
    [startClarify, startPlan, startQuick],
  );

  const setMessages = useCallback((messages: ChatMessage[]) => {
    setState((s) => ({ ...s, messages }));
  }, []);

  const setBriefDraft = useCallback((briefDraft: BriefDraft) => {
    setState((s) => ({ ...s, briefDraft }));
  }, []);

  const setBriefId = useCallback((briefId: string) => {
    setState((s) => ({ ...s, briefId }));
  }, []);

  const markConverseStarted = useCallback(() => {
    setState((s) => ({ ...s, converseStarted: true }));
  }, []);

  const markConverseComplete = useCallback(() => {
    setState((s) => ({ ...s, converseComplete: true }));
  }, []);

  const setMatches = useCallback((matches: MatchCandidate[] | null) => {
    setState((s) => ({ ...s, matches }));
  }, []);

  const setRoadmap = useCallback(
    (args: { id: string; steps: RoadmapStep[]; disclaimer: string }) => {
      setState((s) => ({
        ...s,
        roadmapId: args.id,
        roadmapSteps: args.steps,
        roadmapDisclaimer: args.disclaimer,
      }));
    },
    [],
  );

  const resolveClarifyToQuick = useCallback(() => {
    setState((s) => ({
      ...s,
      path: 'quick',
      converseStarted: false,
      briefDraft: {},
      messages: [{ role: 'user', content: s.goal }],
    }));
  }, []);

  const resolveClarifyToPlan = useCallback(() => {
    setState((s) => ({
      ...initial,
      path: 'plan',
      goal: s.goal,
    }));
  }, []);

  const reset = useCallback(() => setState(initial), []);

  const value = useMemo(
    () => ({
      ...state,
      startQuick,
      startPlan,
      startClarify,
      startFromInput,
      setMessages,
      setBriefDraft,
      setBriefId,
      markConverseStarted,
      markConverseComplete,
      setMatches,
      setRoadmap,
      resolveClarifyToQuick,
      resolveClarifyToPlan,
      reset,
    }),
    [
      state,
      startQuick,
      startPlan,
      startClarify,
      startFromInput,
      setMessages,
      setBriefDraft,
      setBriefId,
      markConverseStarted,
      markConverseComplete,
      setMatches,
      setRoadmap,
      resolveClarifyToQuick,
      resolveClarifyToPlan,
      reset,
    ],
  );

  return (
    <DemoFlowContext.Provider value={value}>{children}</DemoFlowContext.Provider>
  );
}

export function useDemoFlow(): DemoFlowValue {
  const ctx = useContext(DemoFlowContext);
  if (!ctx) throw new Error('useDemoFlow must be used within DemoFlowProvider');
  return ctx;
}
