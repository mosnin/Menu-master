import type {
  SpecialistContract,
  SpecialistInput,
  SpecialistOutput,
  SpecialistRole,
} from './types';

export type SpecialistExecutor = (input: SpecialistInput) => Promise<SpecialistOutput>;

interface RegisteredSpecialist {
  contract: SpecialistContract;
  execute: SpecialistExecutor;
}

const registry = new Map<SpecialistRole, RegisteredSpecialist>();

export function registerSpecialist(
  contract: SpecialistContract,
  execute: SpecialistExecutor,
): void {
  if (registry.has(contract.role)) {
    throw new Error(
      `Duplicate specialist registration: role '${contract.role}' is already registered`,
    );
  }
  registry.set(contract.role, { contract, execute });
}

export function getSpecialist(
  role: SpecialistRole,
): RegisteredSpecialist | undefined {
  return registry.get(role);
}

export function getAllSpecialists(): RegisteredSpecialist[] {
  return Array.from(registry.values());
}
