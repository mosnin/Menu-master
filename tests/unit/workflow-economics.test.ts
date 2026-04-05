import { describe, expect, it } from 'vitest';
import { detectNegativeValueSignals, estimateTimeSavedForTrace } from '@/lib/services/workflow-economics-service';

describe('workflow economics ROI heuristics', () => {
  it('estimates gross vs net time saved with review/correction burden', () => {
    const estimate = estimateTimeSavedForTrace({
      disposition: 'auto_execute',
      toolName: 'create_notification',
      wasOverride: false,
      hadCorrection: true,
    });

    expect(estimate.grossMinutesSaved).toBeGreaterThan(estimate.netMinutesSaved);
    expect(estimate.correctionMinutesCost).toBeGreaterThan(0);
  });

  it('detects high-overhead low-value automation patterns', () => {
    const signals = detectNegativeValueSignals({
      overrideRate: 0.35,
      correctionRate: 0.22,
      failureRate: 0.18,
      runVolume: 2,
      netMinutesSaved: 10,
      costUnits: 20,
    });

    expect(signals.some((signal) => signal.signalType === 'high_override_rate')).toBe(true);
    expect(signals.some((signal) => signal.signalType === 'high_correction_rate')).toBe(true);
    expect(signals.some((signal) => signal.signalType === 'high_failure_rate')).toBe(true);
    expect(signals.some((signal) => signal.signalType === 'low_usage')).toBe(true);
    expect(signals.some((signal) => signal.signalType === 'low_value_relative_to_burden')).toBe(true);
  });
});
