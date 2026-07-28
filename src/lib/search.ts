import type { Exercise } from '../types'
import { EQUIPMENT_LABELS, MUSCLE_GROUP_LABELS } from './format'

/**
 * Filters the library by a typed query.
 *
 * Muscle group and equipment are searched alongside the name, so "chest" or
 * "cable" find the right exercises without knowing what they are called. Terms
 * are matched independently, so word order doesn't matter.
 */
export function filterExercises(exercises: Exercise[], query: string): Exercise[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return exercises

  return exercises.filter((exercise) => {
    const haystack = [
      exercise.name,
      MUSCLE_GROUP_LABELS[exercise.muscleGroup],
      EQUIPMENT_LABELS[exercise.equipment],
    ]
      .join(' ')
      .toLowerCase()
    return terms.every((term) => haystack.includes(term))
  })
}
