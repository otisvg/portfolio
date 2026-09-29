/**
 * Lore pages scattered across both levels. Read together they tell what really happened
 * the night the seam broke, and hint at what's still below.
 */
export interface LorePage { id: string; title: string; level: "outskirts" | "mines"; text: string[] }

export const LORE: LorePage[] = [
  { id: "o_pip", level: "outskirts", title: "Pip's Drawing", text: ["A crayon scarecrow with an enormous smile and a little lantern.", "Underneath, in careful letters: MY FRIEND WICK. HE WAVES AT NIGHT."] },
  { id: "o_notice", level: "outskirts", title: "A Notice on the Gate", text: ["BY ORDER OF THE MILLER:", "The scarecrow in Miller's Field is NOT to be moved, mended or burned.", "He keeps more than crows away."] },
  { id: "o_ledger3", level: "outskirts", title: "The Miller's Ledger, p. 3", text: ["Good harvest. Forty sacks sold to the mine.", "The Foreman pays in silver that smells of the sea. Tam carried the sacks down himself, grinning like a boy."] },
  { id: "o_ledger9", level: "outskirts", title: "The Miller's Ledger, p. 9", text: ["The wheat by the cellar door grows purple at the roots.", "The Foreman says it's only the damp coming up from below. He doesn't look at me when he says it."] },
  { id: "o_letter", level: "outskirts", title: "A Letter to Maud", text: ["Mother,", "They've opened a new seam, deep, below the old water line. The lads call it the Gleam. It hums at night, like the Hearth does.", "Don't worry. I keep the lamps lit.", "Your loving son, Tam."] },
  { id: "o_burnt", level: "outskirts", title: "A Burnt Page", text: ["...the bell rang three times and then it would not stop. Water came up through the mill cellar, and something in it.", "Old Wick stood in the field all night with his lantern, waving the village back from the mill.", "In the morning he was still standing there. He is still standing there."] },
  { id: "m_roster", level: "mines", title: "Shift Roster", text: ["FOREMAN: G. Waterman.", "LAMPS: T. (Tam).", "NIGHT SHIFT: the Gleam seam. Bell drill at dawn.", "Scrawled in the margin: nobody sleeps near the Gleam twice."] },
  { id: "m_lamplog", level: "mines", title: "Tam's Lamp Log", text: ["Lamp twelve won't stay lit near the Gleam. Something drinks the light.", "I hear it breathing in the rock. Slow. Patient. Like wheat growing."] },
  { id: "m_day1", level: "mines", title: "The Foreman's Log, Day 1", text: ["We broke through into a hollow. Warm water, purple silt.", "The men want to stop. The mill needs the silver. The village needs the mill. We dig."] },
  { id: "m_day9", level: "mines", title: "The Foreman's Log, Day 9", text: ["The orchard roots came down overnight, a hundred feet through solid rock, following the water.", "Like they were thirsty. Or called."] },
  { id: "m_last", level: "mines", title: "The Foreman's Log, Last Day", text: ["The seam opened. It wasn't water. It was the Rot, and it rose.", "I rang the bell so they would run. I'll ring it until they're all out.", "I'll ring it until..."] },
  { id: "m_pip", level: "mines", title: "A Child's Note, Wet", text: ["IF YOU FIND THIS:", "I followed the water. The Rot didn't come FROM the mine. It's still going DOWN. Deeper than the shaft.", "I'm going to look. Don't tell Mum.  - P."] },
];

export const loreById = (id: string) => LORE.find((p) => p.id === id);
