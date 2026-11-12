import { CircleOff, RotateCw } from 'lucide-react'
import { StateBadge } from './StateBadge'
import { OBSERVATION_LABEL, plumbState, type ObservationState } from '@/realtime/observation'

export function ObservationBadge({ state }: { state: ObservationState }) {
  const old = plumbState(state)
  const Icon = state === 'CALIBRATING' ? RotateCw : CircleOff
  return old ? <StateBadge state={old} /> : <span className="inline-flex items-center gap-1.5 text-sm font-medium"><Icon className="size-4 text-muted-foreground" aria-hidden /><span>{OBSERVATION_LABEL[state]}</span></span>
}
