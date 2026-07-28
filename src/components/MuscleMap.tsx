import type { MuscleGroup } from '../types'
import { MUSCLE_GROUP_LABELS } from '../lib/format'

/**
 * A front and back body diagram with the trained muscle group highlighted.
 *
 * Both views are drawn because half the groups are posterior — highlighting
 * hamstrings or glutes on a front view would be meaningless. The figure is
 * built from plain ellipses and rounded rectangles: a diagram rather than an
 * illustration, which keeps it honest about what it is and legible at 200px.
 */
export function MuscleMap({ group }: { group: MuscleGroup }) {
  const on = (region: MuscleGroup) => (region === group ? 'part active' : 'part')

  return (
    <figure className="muscle-map-wrap">
      <svg
        className="muscle-map"
        viewBox="0 0 250 250"
        role="img"
        aria-label={`Body diagram highlighting the ${MUSCLE_GROUP_LABELS[group].toLowerCase()}`}
      >
        {/* ---------------- Front ---------------- */}
        <g>
          <ellipse className="part neutral" cx="55" cy="22" rx="12" ry="14" />
          <rect className="part neutral" x="50" y="34" width="10" height="9" rx="3" />

          <ellipse className={on('shoulders')} cx="32" cy="53" rx="10" ry="9" />
          <ellipse className={on('shoulders')} cx="78" cy="53" rx="10" ry="9" />

          <rect className={on('chest')} x="38" y="45" width="34" height="26" rx="9" />
          <rect className={on('core')} x="43" y="73" width="24" height="30" rx="6" />

          <ellipse className={on('biceps')} cx="27" cy="75" rx="7" ry="14" />
          <ellipse className={on('biceps')} cx="83" cy="75" rx="7" ry="14" />
          <ellipse className="part neutral" cx="23" cy="103" rx="6" ry="15" />
          <ellipse className="part neutral" cx="87" cy="103" rx="6" ry="15" />

          <rect className="part neutral" x="40" y="103" width="30" height="16" rx="6" />

          <ellipse className={on('quads')} cx="46" cy="146" rx="9" ry="27" />
          <ellipse className={on('quads')} cx="64" cy="146" rx="9" ry="27" />
          {/* The inner thigh overlaps both quads, so it is only drawn when it
              is the group being highlighted — otherwise it would paint an idle
              stripe over an active pair of quads. */}
          {group === 'adductors' && (
            <ellipse className="part active" cx="55" cy="140" rx="6" ry="21" />
          )}

          <ellipse className="part neutral" cx="46" cy="196" rx="7" ry="23" />
          <ellipse className="part neutral" cx="64" cy="196" rx="7" ry="23" />

          <text className="view-label" x="55" y="238">
            Front
          </text>
        </g>

        {/* ---------------- Back ---------------- */}
        <g transform="translate(140, 0)">
          <ellipse className="part neutral" cx="55" cy="22" rx="12" ry="14" />
          <rect className="part neutral" x="50" y="34" width="10" height="9" rx="3" />

          <ellipse className={on('shoulders')} cx="32" cy="53" rx="10" ry="9" />
          <ellipse className={on('shoulders')} cx="78" cy="53" rx="10" ry="9" />

          <rect className={on('back')} x="38" y="45" width="34" height="50" rx="9" />

          <ellipse className={on('triceps')} cx="27" cy="75" rx="7" ry="14" />
          <ellipse className={on('triceps')} cx="83" cy="75" rx="7" ry="14" />
          <ellipse className="part neutral" cx="23" cy="103" rx="6" ry="15" />
          <ellipse className="part neutral" cx="87" cy="103" rx="6" ry="15" />

          <ellipse className={on('glutes')} cx="46" cy="110" rx="11" ry="12" />
          <ellipse className={on('glutes')} cx="64" cy="110" rx="11" ry="12" />

          <ellipse className={on('hamstrings')} cx="46" cy="152" rx="9" ry="26" />
          <ellipse className={on('hamstrings')} cx="64" cy="152" rx="9" ry="26" />

          <ellipse className={on('calves')} cx="46" cy="198" rx="8" ry="22" />
          <ellipse className={on('calves')} cx="64" cy="198" rx="8" ry="22" />

          <text className="view-label" x="55" y="238">
            Back
          </text>
        </g>
      </svg>
      <figcaption className="muted-xs">{MUSCLE_GROUP_LABELS[group]}</figcaption>
    </figure>
  )
}
