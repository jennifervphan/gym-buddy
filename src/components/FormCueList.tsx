import type { FormCues } from '../types'

/** The three reference cues for an exercise: how to set up, do it, and what to watch for. */
export function FormCueList({ cues }: { cues: FormCues }) {
  return (
    <dl className="cue-list">
      <div className="cue">
        <dt>Set up</dt>
        <dd>{cues.setup}</dd>
      </div>
      <div className="cue">
        <dt>Do it</dt>
        <dd>{cues.execution}</dd>
      </div>
      <div className="cue watch">
        <dt>Watch for</dt>
        <dd>{cues.mistake}</dd>
      </div>
    </dl>
  )
}
