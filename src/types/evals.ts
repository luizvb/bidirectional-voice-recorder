export type AnalysisMode = 'interview' | 'language' | 'meeting';
export type EvalDifficulty = 'standard' | 'hard' | 'adversarial';
export type EvalCategory = 'normal' | 'incomplete' | 'ambiguous' | 'long' | 'contradictory' | 'adversarial';
export type EvalDimension = 'factuality' | 'coverage' | 'specificity' | 'depth' | 'actionability' | 'calibration' | 'executiveQuality';

export interface EvalRunConfig { caseCount: number; language: string; outputLanguage: string; modes: AnalysisMode[]; difficulty: EvalDifficulty; categories: EvalCategory[]; insightModel?: string; supervisorModel?: string; systemPrompt?: string; supervisorPrompt?: string; }
export interface EvalScenario { title: string; category: EvalCategory; mode: AnalysisMode; context: string; expectedFacts: string[]; absentFacts: string[]; expectedSignals: string[]; }
export interface DeterministicCheck { id: string; label: string; passed: boolean; severity: 'critical' | 'major' | 'minor'; detail: string; }
export interface JudgeScorecard { scores: Record<EvalDimension, number>; overallScore: number; verdict: 'pass' | 'mixed' | 'fail'; strengths: string[]; improvements: string[]; criticalFailures: string[]; failureTags: string[]; promptRecommendation: string; }
export interface EvalCaseResult { id: string; position: number; status: string; scenario?: EvalScenario; transcript?: string; analysis?: any; deterministicChecks?: DeterministicCheck[]; judgment?: JudgeScorecard; metrics?: { latencyMs?: number; totalTokens?: number; costUsd?: number }; error?: string; }
export interface EvalRunSummary { total: number; completed: number; failed: number; canceled: number; overallScore: number; dimensions: Record<EvalDimension, number>; costUsd: number; averageLatencyMs: number; failureTags: string[]; }
export interface PromptReview { summary: string; recurringStrengths: string[]; recurringFailures: string[]; adjustments: Array<{ priority: 'critical' | 'high' | 'medium' | 'low'; issue: string; change: string; expectedImpact: string }>; improvedPrompt: string; model: string; totalTokens: number; costUsd: number; generatedAt: string; }
export interface EvalRun { id: string; status: string; config: EvalRunConfig; insightModel: string; supervisorModel: string; promptHash: string; summary?: EvalRunSummary; promptReview?: PromptReview; createdAt: string; startedAt?: string; completedAt?: string; cases?: EvalCaseResult[]; }
