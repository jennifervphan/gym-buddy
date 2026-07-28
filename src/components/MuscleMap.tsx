import { useId } from 'react'
import type { MuscleGroup } from '../types'
import { MUSCLE_GROUP_LABELS } from '../lib/format'

/**
 * The body outline, as one continuous silhouette.
 *
 * Rendered twice: once filled as the figure, once inside a <clipPath> so the
 * muscle shapes can never spill past the body's edge. A clipPath's children
 * must be shapes — it cannot reference a group through <use> — which is why
 * this is a component rather than a single reusable element.
 */
function Silhouette() {
  return (
    <>
      <ellipse cx="50" cy="22" rx="10" ry="12.5" />
      <path d="M45 31 L55 31 C55 37 56 41 58 44 L42 44 C44 41 45 37 45 31 Z" />
      {/* torso: shoulders out to 31–69, waist in to 39–61 */}
      <path
        d="M50 42 C56 42 61 44 65 48 C68 51 69 56 69 62
           C69 70 67 79 65 88 C63 95 62 101 61 107
           C61 115 62 123 63 132 C64 140 63 147 61 151
           L39 151 C37 147 36 140 37 132
           C38 123 39 115 39 107 C38 101 37 95 35 88
           C33 79 31 70 31 62 C31 56 32 51 35 48
           C39 44 44 42 50 42 Z"
      />
      {/* arms hang clear of the torso below the armpit, so each limb reads apart */}
      <path
        d="M66 47 C72 48 77 53 79 61 C81 71 81 83 80 94
           C79 104 78 113 77 122 C76 130 75 137 74 142
           C73 147 68 147 67 142 C66 134 69 124 70 114
           C71 102 70 88 70 74 C70 63 68 52 66 47 Z"
      />
      <path
        d="M34 47 C28 48 23 53 21 61 C19 71 19 83 20 94
           C21 104 22 113 23 122 C24 130 25 137 26 142
           C27 147 32 147 33 142 C34 134 31 124 30 114
           C29 102 30 88 30 74 C30 63 32 52 34 47 Z"
      />
      {/* both legs in one path, so the join between them is never a seam */}
      <path
        d="M37 147 L63 147
           C64 158 63 172 61 186 C60 196 58 212 57 232
           C57 240 57 245 57 247 C57 250 51 250 51 247
           C51 232 52 212 52 196 C52 186 51 172 50 162
           C49 172 48 186 48 196 C48 212 49 232 49 247
           C49 250 43 250 43 247 C43 245 43 240 43 232
           C42 212 40 196 39 186 C37 172 36 158 37 147 Z"
      />
      <ellipse cx="54" cy="247" rx="5.5" ry="3" />
      <ellipse cx="46" cy="247" rx="5.5" ry="3" />
    </>
  )
}

/** Deltoid caps, drawn on both views. */
function Delts() {
  return (
    <>
      <path d="M66 47 C72 48 77 53 79 61 C79 67 76 70 72 69 C68 67 66 61 66 52 Z" />
      <path d="M34 47 C28 48 23 53 21 61 C21 67 24 70 28 69 C32 67 34 61 34 52 Z" />
    </>
  )
}

/** Upper-arm mass — biceps on the front view, triceps on the back. */
function UpperArms() {
  return (
    <>
      <path d="M70 72 C75 72 79 77 79 86 C79 95 77 101 74 103 C71 104 69 101 69 95 C69 86 69 78 70 72 Z" />
      <path d="M30 72 C25 72 21 77 21 86 C21 95 23 101 26 103 C29 104 31 101 31 95 C31 86 31 78 30 72 Z" />
    </>
  )
}

/** Thigh mass — quads on the front view, hamstrings on the back. */
function Thighs({ top, bottom }: { top: number; bottom: number }) {
  const mid = (top + bottom) / 2
  return (
    <>
      <path
        d={`M52 ${top} C60 ${top} 64 ${top + 6} 64 ${mid - 4} C63 ${mid + 6} 61 ${bottom - 6} 59 ${bottom} C57 ${bottom + 4} 53 ${bottom + 3} 53 ${bottom - 4} C53 ${mid} 52 ${top + 10} 52 ${top} Z`}
      />
      <path
        d={`M48 ${top} C40 ${top} 36 ${top + 6} 36 ${mid - 4} C37 ${mid + 6} 39 ${bottom - 6} 41 ${bottom} C43 ${bottom + 4} 47 ${bottom + 3} 47 ${bottom - 4} C47 ${mid} 48 ${top + 10} 48 ${top} Z`}
      />
    </>
  )
}

const FRONT: Partial<Record<MuscleGroup, React.ReactNode>> = {
  shoulders: <Delts />,
  biceps: <UpperArms />,
  chest: (
    <>
      <path d="M50 52 C57 52 64 55 66 61 C67 67 64 73 58 75 C53 76 50 74 50 70 Z" />
      <path d="M50 52 C43 52 36 55 34 61 C33 67 36 73 42 75 C47 76 50 74 50 70 Z" />
    </>
  ),
  core: (
    <path d="M43 80 L57 80 C58 95 58 112 56 127 C54 132 46 132 44 127 C42 112 42 95 43 80 Z" />
  ),
  quads: <Thighs top={156} bottom={198} />,
  // A single shape across the crotch: the silhouette's notch clips the middle
  // out, leaving exactly the two inner thighs.
  adductors: (
    <path d="M50 155 C58 158 58 178 57 192 C56 198 44 198 43 192 C42 178 42 158 50 155 Z" />
  ),
}

const BACK: Partial<Record<MuscleGroup, React.ReactNode>> = {
  shoulders: <Delts />,
  triceps: <UpperArms />,
  back: (
    <path
      d="M50 46 C58 46 65 50 67 58 C68 70 66 84 63 97
         C61 105 57 111 50 111 C43 111 39 105 37 97
         C34 84 32 70 33 58 C35 50 42 46 50 46 Z"
    />
  ),
  glutes: (
    <>
      <path d="M50 126 C57 126 63 131 64 140 C64 150 59 157 52 157 C50 157 50 152 50 146 Z" />
      <path d="M50 126 C43 126 37 131 36 140 C36 150 41 157 48 157 C50 157 50 152 50 146 Z" />
    </>
  ),
  hamstrings: <Thighs top={158} bottom={198} />,
  calves: (
    <>
      <path d="M53 206 C58 206 60 212 60 220 C59 228 57 234 55 236 C53 237 52 234 52 229 C52 219 52 211 53 206 Z" />
      <path d="M47 206 C42 206 40 212 40 220 C41 228 43 234 45 236 C47 237 48 234 48 229 C48 219 48 211 47 206 Z" />
    </>
  ),
}

/**
 * Front and back body diagram with the trained muscle group highlighted.
 *
 * Both views are drawn because half the groups are posterior — highlighting
 * hamstrings on a front view would say nothing.
 */
export function MuscleMap({ group }: { group: MuscleGroup }) {
  const clipId = `${useId()}-silhouette`
  const label = MUSCLE_GROUP_LABELS[group]

  return (
    // No caption: the exercise's muscle group is already named on every screen
    // that shows this, and "Back" under the "Back" view label reads as a bug.
    <div className="muscle-map-wrap">
      <svg
        className="muscle-map"
        viewBox="0 0 240 272"
        role="img"
        aria-label={`Body diagram highlighting the ${label.toLowerCase()}`}
      >
        <defs>
          <clipPath id={clipId}>
            <Silhouette />
          </clipPath>
        </defs>

        <g>
          <g className="figure">
            <Silhouette />
          </g>
          <g className="muscle" clipPath={`url(#${clipId})`}>
            {FRONT[group]}
          </g>
          <text className="view-label" x="50" y="266">
            Front
          </text>
        </g>

        <g transform="translate(140, 0)">
          <g className="figure">
            <Silhouette />
          </g>
          <g className="muscle" clipPath={`url(#${clipId})`}>
            {BACK[group]}
          </g>
          <text className="view-label" x="50" y="266">
            Back
          </text>
        </g>
      </svg>
    </div>
  )
}
