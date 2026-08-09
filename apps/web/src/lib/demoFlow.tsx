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
  type ConversationDetail,
  type ConversationPath,
  type MatchCandidate,
  type RoadmapStep,
} from '@inyalink/shared';

export type DemoPath = 'quick' | 'plan' | 'clarify' | 'unrelated';

/** Result of classifying an opening message — always stays in the panel. */
export type StartFromInputResult = {
  destination: 'panel';
  path: DemoPath;
  goal: string;
  messages: ChatMessage[];
};

type DemoFlowState = {
  conversationId: string | null;
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
  startUnrelated: (goal: string) => void;
  /** Classify opening text. Logs decision. Always opens the panel. */
  startFromInput: (goal: string) => StartFromInputResult;
  setMessages: (messages: ChatMessage[]) => void;
  setBriefDraft: (draft: BriefDraft) => void;
  setBriefId: (id: string) => void;
  setConversationId: (id: string | null) => void;
  markConverseStarted: () => void;
  markConverseComplete: () => void;
  setMatches: (matches: MatchCandidate[] | null) => void;
  setRoadmap: (args: {
    id: string;
    steps: RoadmapStep[];
    disclaimer: string;
  }) => void;
  clearRoadmap: () => void;
  resolveClarifyToQuick: () => void;
  resolveClarifyToPlan: () => void;
  /** Mid-chat handoff to roadmap (dont-know / API redirect). */
  handoffToRoadmap: () => void;
  /**
   * After a roadmap: start a hire brief for one step's category.
   * Keeps plan cards visible; opens a clean brief thread (no bare "4" bubble).
   */
  beginStepHire: (step: RoadmapStep, userText?: string) => void;
  /** Follow-up that changes the goal — new plan, same transcript. */
  continueAsPlan: (goal: string, userText: string) => void;
  /** Follow-up that starts a hire brief — same transcript. */
  continueAsQuick: (goal: string, userText: string) => void;
  /** Resume a saved conversation in the panel. */
  loadConversation: (detail: ConversationDetail) => void;
  /** Empty panel for a fresh chat (keeps history elsewhere). */
  startNewConversation: () => void;
  reset: () => void;
};

const initial: DemoFlowState = {
  conversationId: null,
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
    const trimmed = goal.trim();
    setState({
      ...initial,
      path: 'plan',
      goal: trimmed,
      messages: [{ role: 'user', content: trimmed }],
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

  const startUnrelated = useCallback((goal: string) => {
    const trimmed = goal.trim();
    setState({
      ...initial,
      path: 'unrelated',
      goal: trimmed,
      messages: [{ role: 'user', content: trimmed }],
      converseStarted: true,
    });
  }, []);

  const startFromInput = useCallback(
    (goal: string): StartFromInputResult => {
      const trimmed = goal.trim();
      const shape = classifyInputShape(trimmed);
      const messages: ChatMessage[] = [{ role: 'user', content: trimmed }];
      console.log('[classify]', {
        input: trimmed,
        shape,
        destination: 'panel',
      });
      if (shape === 'goal') {
        startPlan(trimmed);
        return { destination: 'panel', path: 'plan', goal: trimmed, messages };
      }
      if (shape === 'service') {
        startQuick(trimmed);
        return { destination: 'panel', path: 'quick', goal: trimmed, messages };
      }
      if (shape === 'unrelated') {
        startUnrelated(trimmed);
        return {
          destination: 'panel',
          path: 'unrelated',
          goal: trimmed,
          messages,
        };
      }
      startClarify(trimmed);
      return {
        destination: 'panel',
        path: 'clarify',
        goal: trimmed,
        messages,
      };
    },
    [startClarify, startPlan, startQuick, startUnrelated],
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

  const setConversationId = useCallback((conversationId: string | null) => {
    setState((s) => ({ ...s, conversationId }));
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

  const clearRoadmap = useCallback(() => {
    setState((s) => ({
      ...s,
      roadmapId: null,
      roadmapSteps: [],
      roadmapDisclaimer: null,
    }));
  }, []);

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
      ...s,
      path: 'plan',
      converseStarted: true,
      converseComplete: false,
      roadmapId: null,
      roadmapSteps: [],
      roadmapDisclaimer: null,
      matches: null,
      briefId: null,
    }));
  }, []);

  const handoffToRoadmap = useCallback(() => {
    setState((s) => ({
      ...s,
      path: 'plan',
      converseStarted: true,
      converseComplete: false,
      roadmapId: null,
      roadmapSteps: [],
      roadmapDisclaimer: null,
      matches: null,
      briefId: null,
    }));
  }, []);

  const beginStepHire = useCallback((step: RoadmapStep, _userText?: string) => {
    // Use the step title as the opening — never echo a bare step number ("4")
    // which reads as a stray bubble and confuses the converse classifier.
    setState((s) => ({
      ...s,
      path: 'quick',
      goal: step.title,
      messages: [{ role: 'user', content: step.title }],
      briefDraft: {
        category: step.category_slug,
        title: step.title,
        description: step.why,
        budget_min_mmk: step.est_min_mmk,
        budget_max_mmk: step.est_max_mmk,
      },
      briefId: null,
      converseStarted: false,
      converseComplete: false,
      matches: null,
    }));
  }, []);

  const continueAsPlan = useCallback((nextGoal: string, userText: string) => {
    const trimmed = nextGoal.trim();
    setState((s) => ({
      ...s,
      path: 'plan',
      goal: trimmed,
      messages: [...s.messages, { role: 'user', content: userText }],
      briefDraft: {},
      briefId: null,
      roadmapId: null,
      roadmapSteps: [],
      roadmapDisclaimer: null,
      converseStarted: true,
      converseComplete: false,
      matches: null,
    }));
  }, []);

  const continueAsQuick = useCallback((nextGoal: string, userText: string) => {
    const trimmed = nextGoal.trim();
    setState((s) => ({
      ...s,
      path: 'quick',
      goal: trimmed,
      messages: [...s.messages, { role: 'user', content: userText }],
      briefDraft: {},
      briefId: null,
      converseStarted: false,
      converseComplete: false,
      matches: null,
    }));
  }, []);

  const loadConversation = useCallback((detail: ConversationDetail) => {
    const path: ConversationPath | DemoPath = detail.path ?? 'quick';
    const opening =
      detail.messages.find((m) => m.role === 'user')?.content ?? detail.title;
    setState({
      ...initial,
      conversationId: detail.id,
      path,
      goal: opening,
      messages: detail.messages,
      briefDraft: detail.briefDraft,
      converseStarted: true,
      converseComplete: detail.complete,
    });
  }, []);

  const startNewConversation = useCallback(() => {
    setState(initial);
  }, []);

  const reset = useCallback(() => setState(initial), []);

  const value = useMemo(
    () => ({
      ...state,
      startQuick,
      startPlan,
      startClarify,
      startUnrelated,
      startFromInput,
      setMessages,
      setBriefDraft,
      setBriefId,
      setConversationId,
      markConverseStarted,
      markConverseComplete,
      setMatches,
      setRoadmap,
      clearRoadmap,
      resolveClarifyToQuick,
      resolveClarifyToPlan,
      handoffToRoadmap,
      beginStepHire,
      continueAsPlan,
      continueAsQuick,
      loadConversation,
      startNewConversation,
      reset,
    }),
    [
      state,
      startQuick,
      startPlan,
      startClarify,
      startUnrelated,
      startFromInput,
      setMessages,
      setBriefDraft,
      setBriefId,
      setConversationId,
      markConverseStarted,
      markConverseComplete,
      setMatches,
      setRoadmap,
      clearRoadmap,
      resolveClarifyToQuick,
      resolveClarifyToPlan,
      handoffToRoadmap,
      beginStepHire,
      continueAsPlan,
      continueAsQuick,
      loadConversation,
      startNewConversation,
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
