import type { FormCues } from '../types'

/**
 * Reference cues for the built-in library, keyed by exercise name.
 *
 * These are read-only: `Exercise.notes` is the user's own field. Keeping them
 * separate means the cues can be improved in a later release and refreshed onto
 * an existing library without touching anything the user has edited.
 */
export const FORM_CUES: Record<string, FormCues> = {
  'Back Squat': {
    setup: 'Bar on your upper back, feet about shoulder-width, toes turned slightly out.',
    execution: 'Sit down and back until your hip crease passes your knee, then drive up through mid-foot.',
    mistake: 'Knees caving inwards — think about pushing them out over your toes.',
  },
  'Bench Press': {
    setup: 'Eyes under the bar, shoulder blades pulled back and down, feet flat on the floor.',
    execution: 'Lower to mid-chest with your elbows around 45° from your body, then press back up.',
    mistake: 'Flaring the elbows straight out to the sides, which loads the shoulder joint.',
  },
  Deadlift: {
    setup: 'Bar over mid-foot, shins close to it, hips higher than knees, back flat.',
    execution: 'Push the floor away and stand up, keeping the bar dragging up against your legs.',
    mistake: 'Hips shooting up first, turning it into a stiff-legged pull with a rounded back.',
  },
  'Overhead Press': {
    setup: 'Bar resting on your front delts, grip just outside your shoulders, ribs pulled down.',
    execution: 'Press straight up, moving your head back out of the way, finishing with the bar over your ears.',
    mistake: 'Leaning back through the lower back instead of bracing the trunk.',
  },
  'Barbell Row': {
    setup: 'Hinge forward to about 45°, back flat, bar hanging at arm’s length.',
    execution: 'Pull to your lower ribs with your elbows going past your torso, then lower under control.',
    mistake: 'Standing up as you pull, so momentum does the work instead of your back.',
  },
  'Front Squat': {
    setup: 'Bar across your front delts, elbows held high, feet about shoulder-width.',
    execution: 'Sit straight down keeping your torso upright, then drive back up.',
    mistake: 'Letting the elbows drop, which pitches you forward and rolls the bar off.',
  },
  'Romanian Deadlift': {
    setup: 'Stand tall with the bar against your thighs and a soft bend in the knees.',
    execution: 'Push your hips back, sliding the bar down your legs until your hamstrings stretch, then stand.',
    mistake: 'Squatting the weight down instead of hinging at the hip.',
  },
  'Hip Thrust': {
    setup: 'Upper back against a bench, bar over your hips, feet flat so your shins end up vertical.',
    execution: 'Drive through your heels until your hips are level with your knees, squeeze, then lower.',
    mistake: 'Arching the lower back at the top rather than finishing the movement with your glutes.',
  },
  'Incline Dumbbell Press': {
    setup: 'Bench set to 30–45°, dumbbells at chest height, wrists stacked over your elbows.',
    execution: 'Press up and slightly together, then lower until you feel a stretch across the chest.',
    mistake: 'Setting the bench too steep, which turns it into a shoulder press.',
  },
  'Dumbbell Shoulder Press': {
    setup: 'Seated with your back supported, dumbbells at ear height, palms facing forward.',
    execution: 'Press overhead until your arms are straight, then lower under control.',
    mistake: 'Bouncing out of the bottom or arching the back to help the weight up.',
  },
  'Dumbbell Row': {
    setup: 'One hand and knee on a bench, back flat, dumbbell hanging straight down.',
    execution: 'Pull the dumbbell to your hip keeping the elbow close, then lower to a full stretch.',
    mistake: 'Twisting the torso to heave up a weight that is too heavy.',
  },
  'Bulgarian Split Squat': {
    setup: 'Rear foot on a bench, front foot far enough forward that its shin stays near vertical.',
    execution: 'Lower until your front thigh is about parallel, then drive up through the front heel.',
    mistake: 'Standing too close to the bench, so the front knee travels well past the toes.',
  },
  'Dumbbell Curl': {
    setup: 'Stand tall with your arms at your sides and your elbows tucked in.',
    execution: 'Curl without letting the elbow move, then lower slowly to full extension.',
    mistake: 'Swinging the torso to start each rep.',
  },
  'Lateral Raise': {
    setup: 'Lean forward very slightly, dumbbells at your sides, elbows softly bent.',
    execution: 'Raise out to shoulder height leading with your elbows, then lower slowly.',
    mistake: 'Going too heavy and shrugging the weight up with your traps.',
  },
  'Dumbbell Lunge': {
    setup: 'Stand tall with a dumbbell in each hand at your sides.',
    execution: 'Step forward and lower your back knee towards the floor, then push back to the start.',
    mistake: 'Leaning forward over the front leg instead of staying upright.',
  },
  'Lat Pulldown': {
    setup: 'Thighs locked under the pad, hands a little wider than your shoulders.',
    execution: 'Pull the bar to your collarbone by driving your elbows down, then let it rise fully.',
    mistake: 'Leaning far back and moving the stack with your whole body.',
  },
  'Seated Cable Row': {
    setup: 'Chest up, slight bend in the knees, arms extended in front of you.',
    execution: 'Pull the handle to your stomach with elbows close, then return without slumping forward.',
    mistake: 'Rocking backwards and forwards from the lower back.',
  },
  'Cable Triceps Pushdown': {
    setup: 'Stand close to the stack with your elbows pinned to your sides.',
    execution: 'Straighten your arms fully, then let your forearms rise without the elbows drifting.',
    mistake: 'Letting the elbows travel forward, which turns it into a press.',
  },
  'Cable Face Pull': {
    setup: 'Rope set at upper-chest height, arms extended, thumbs pointing back.',
    execution: 'Pull the rope towards your face, separating your hands, and squeeze the rear delts.',
    mistake: 'Pulling too low, so it becomes a row rather than rear-delt work.',
  },
  'Leg Press': {
    setup: 'Feet about shoulder-width on the platform, back and hips flat against the pad.',
    execution: 'Lower until your knees reach roughly 90°, then press back without slamming the lockout.',
    mistake: 'Going so deep the lower back rounds up off the pad.',
  },
  'Leg Curl': {
    setup: 'Pad sitting just above your heels, hips flat on the bench.',
    execution: 'Curl your heels towards your glutes, squeeze, then lower slowly.',
    mistake: 'Lifting the hips off the pad to steal extra range.',
  },
  'Leg Extension': {
    setup: 'Knees lined up with the machine’s pivot, pad resting on your lower shins.',
    execution: 'Straighten your legs, pause briefly at the top, then lower under control.',
    mistake: 'Swinging the weight up and letting it drop back down.',
  },
  'Chest Fly': {
    setup: 'Handles at chest height, with a slight bend in the elbows that you hold throughout.',
    execution: 'Bring your hands together in a wide arc, then open until you feel a stretch across the chest.',
    mistake: 'Bending and straightening the arms, which quietly makes it a press.',
  },
  'Calf Raise': {
    setup: 'Balls of your feet on the platform with your heels hanging free.',
    execution: 'Rise as high as you can, pause, then lower until you feel a stretch.',
    mistake: 'Bouncing through short reps instead of using the full range.',
  },
  'Hip Abduction': {
    setup: 'Seated upright with the pads against the outside of your knees.',
    execution: 'Press your knees apart, pause at the end, then return slowly.',
    mistake: 'Leaning back and using momentum rather than your glutes.',
  },
  'Hip Adduction': {
    setup: 'Seated upright with the pads against the inside of your knees.',
    execution: 'Squeeze your knees together, pause, then let them open under control.',
    mistake: 'Letting the weight snap your legs apart at the end of the rep.',
  },
  'Pull-up': {
    setup: 'Hang from the bar with hands just wider than your shoulders and shoulders pulled down.',
    execution: 'Pull until your chin clears the bar, then lower all the way to a full hang.',
    mistake: 'Kicking the legs to get up and then dropping down without control.',
  },
  Dip: {
    setup: 'Support yourself on the bars with arms straight; lean forward slightly for more chest.',
    execution: 'Lower until your upper arms are about parallel to the floor, then press back up.',
    mistake: 'Dropping far deeper than your shoulders are comfortable with.',
  },
  'Push-up': {
    setup: 'Hands under your shoulders, body in a straight line from head to heels.',
    execution: 'Lower your chest to just above the floor with elbows around 45°, then press up.',
    mistake: 'Letting the hips sag or pike up instead of holding a plank throughout.',
  },
  Plank: {
    setup: 'Forearms under your shoulders, feet hip-width, body in one straight line.',
    execution: 'Brace your abs and glutes and hold the position, breathing normally.',
    mistake: 'Letting the hips drift up into a pike or sag towards the floor.',
  },
  'Hanging Leg Raise': {
    setup: 'Hang from a bar with your shoulders pulled down away from your ears.',
    execution: 'Raise your legs to hip height or above by curling your pelvis, then lower slowly.',
    mistake: 'Swinging back and forth so momentum does the work.',
  },
  'Side Plank': {
    setup: 'On one forearm, elbow under your shoulder, feet stacked or staggered.',
    execution: 'Lift your hips so head, hips and heels form a line, and hold. Time each side.',
    mistake: 'Letting the hips settle backwards so you are half-lying rather than side-on.',
  },
  'Dead Hang': {
    setup: 'Hang from the bar with an overhand grip, arms straight, feet clear of the floor.',
    execution: 'Keep your shoulders lightly engaged rather than fully slack, and hold.',
    mistake: 'Hanging completely limp with the shoulders jammed up around the ears.',
  },
  "Farmer's Carry": {
    setup: 'A heavy dumbbell in each hand, standing tall with your shoulders back.',
    execution: 'Walk with short controlled steps, ribs down and the weights steady at your sides.',
    mistake: 'Leaning to one side or letting the weights swing into your legs.',
  },
  'Wall Sit': {
    setup: 'Back flat against a wall, feet a stride out, knees bent to about 90°.',
    execution: 'Hold with your thighs parallel to the floor and your weight through your heels.',
    mistake: 'Creeping upwards as it burns so the knees straighten out of position.',
  },
}
