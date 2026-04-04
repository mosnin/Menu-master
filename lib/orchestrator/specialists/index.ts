// Import all specialists to trigger their self-registration via registerSpecialist().
import './exception-specialist';
import './communications-specialist';
import './compliance-specialist';
import './closing-specialist';
import './listing-specialist';
import './handoff-specialist';

// Re-export registry API and types for convenience.
export { getAllSpecialists, getSpecialist, registerSpecialist } from './registry';
export type { SpecialistExecutor } from './registry';
export type {
  SpecialistContract,
  SpecialistFinding,
  SpecialistInput,
  SpecialistOutput,
  SpecialistRecommendation,
  SpecialistRole,
} from './types';
