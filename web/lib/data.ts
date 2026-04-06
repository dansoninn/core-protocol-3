import type { Course, Exercise } from "@/types";

export const EXERCISES: Exercise[] = [
  {
    id: "ex-1",
    name: "Kassa kró",
    category: "Styrkur",
    description: "Klassísk æfing fyrir brjóst, herðar og þríhöfðavöðva.",
    videoUrl: "https://www.youtube.com/embed/IODxDxX7oi4",
  },
  {
    id: "ex-2",
    name: "Dýfur",
    category: "Styrkur",
    description: "Eflir þríhöfðavöðva og brjóstvöðva með líkamsþyngdinni.",
    videoUrl: "https://www.youtube.com/embed/IODxDxX7oi4",
  },
  {
    id: "ex-3",
    name: "Lóðrétt tog",
    category: "Styrkur",
    description: "Styrkir bakið og tvíhöfðavöðva — grundvallarhreyfing í styrktarþjálfun.",
    videoUrl: "https://www.youtube.com/embed/IODxDxX7oi4",
  },
  {
    id: "ex-4",
    name: "Framhliðar útfærsla",
    category: "Liðleiki & hreyfigeta",
    description: "Eykur sveigjanleika í mjaðmabeygju og framlægt legginn.",
    videoUrl: "https://www.youtube.com/embed/IODxDxX7oi4",
  },
  {
    id: "ex-5",
    name: "Brú",
    category: "Endurhæfing",
    description: "Virkjar rass- og kjölvöðva, góð til að koma jafnvægi á mjaðmirnar.",
    videoUrl: "https://www.youtube.com/embed/IODxDxX7oi4",
  },
  {
    id: "ex-6",
    name: "Æðrulegur sprettgangur",
    category: "Þyngdartap",
    description: "Hátíðnisæfing sem heldur hjartslætti uppi og brennir kaloríum hratt.",
    videoUrl: "https://www.youtube.com/embed/IODxDxX7oi4",
  },
  {
    id: "ex-7",
    name: "Öndunarmeðvitund",
    category: "Heilsa & endurnæring",
    description: "Djúp kviðöndunaræfing sem dregur úr streitu og bætir súrefnisupptöku.",
    videoUrl: "https://www.youtube.com/embed/IODxDxX7oi4",
  },
  {
    id: "ex-8",
    name: "Boli kross",
    category: "Liðleiki & hreyfigeta",
    description: "Snúningsæfing fyrir T-hrygg sem léttir á bakverkjum og eykur hreyfigetu.",
    videoUrl: "https://www.youtube.com/embed/IODxDxX7oi4",
  },
  {
    id: "ex-9",
    name: "Hnéhlykkur",
    category: "Styrkur",
    description: "Styrkir lærlegg og rass — ein af mikilvægustu lægri líkamshreyfingum.",
    videoUrl: "https://www.youtube.com/embed/IODxDxX7oi4",
  },
  {
    id: "ex-10",
    name: "Framhliðarhnykkur",
    category: "Endurhæfing",
    description: "Mýkir framhliðar mjaðmarbeygju og eykur stöðugleika í mjóbaki.",
    videoUrl: "https://www.youtube.com/embed/IODxDxX7oi4",
  },
];

export const COURSES: Course[] = [
  {
    id: "course-1",
    slug: "hreysti-i-12-vikur",
    title: "Hreysti í 12 vikur",
    instructor: "Sigríður Björnsdóttir",
    description:
      "Heildaríþróttanámskeið sem er hannað til að byggja upp styrk, þol og liðleika á 12 vikum. Hentar öllum æfingastigum — frá byrjendum að lengra komnum.",
    price: 12900,
    category: "Styrkur",
    coverImage: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
    weeks: [
      {
        id: "w1",
        title: "Vika 1 — Grunnurinn",
        days: [
          {
            id: "day-1-1",
            title: "Dagur 1 — Kynning & upphlutningur",
            videoUrl: "https://www.youtube.com/embed/IODxDxX7oi4",
            workoutText:
              "Í dag förum við í gegnum grunn hreyfimynstur og hlýjum upp líkamann. Einbeittu þér að hreyfingum og ekki hraðanum.\n\n3 × 10 kassa krær\n3 × 8 dýfur\n3 × 12 hnéhlykkjur\n\nHvíld: 60 sekúndur á milli setta.",
            exerciseIds: ["ex-1", "ex-2", "ex-9"],
            isFreePreview: true,
          },
          {
            id: "day-1-2",
            title: "Dagur 2 — Bakið og kjöllinn",
            videoUrl: "https://www.youtube.com/embed/IODxDxX7oi4",
            workoutText:
              "Einblínum á bak- og kjölvöðva. Mikilvægt að halda beinri líkamsstöðu allan tímann.\n\n4 × 8 lóðrétt tog\n3 × 12 brú\n3 × 10 boli kross (hvorum megin)",
            exerciseIds: ["ex-3", "ex-5", "ex-8"],
          },
          {
            id: "day-1-3",
            title: "Dagur 3 — Liðleiki & endurhæfing",
            videoUrl: "https://www.youtube.com/embed/IODxDxX7oi4",
            workoutText:
              "Léttur dagur — einblínið á hreyfigetu og bata. Taktu þér tíma með hverja stöðu.\n\n5 × 30 sek framhliðar útfærsla\n5 × 30 sek framhliðarhnykkur\n5 × öndunarmeðvitund (1 mín).",
            exerciseIds: ["ex-4", "ex-10", "ex-7"],
          },
        ],
      },
      {
        id: "w2",
        title: "Vika 2 — Aukin byrði",
        days: [
          {
            id: "day-2-1",
            title: "Dagur 1 — Þéttari sett",
            videoUrl: "https://www.youtube.com/embed/IODxDxX7oi4",
            workoutText:
              "Við bætum við setti og minnkum hvíldina lítillega.\n\n4 × 10 kassa krær\n4 × 10 dýfur\n4 × 15 hnéhlykkjur\n\nHvíld: 45 sek.",
            exerciseIds: ["ex-1", "ex-2", "ex-9"],
          },
          {
            id: "day-2-2",
            title: "Dagur 2 — Öxl & upphandleggur",
            videoUrl: "https://www.youtube.com/embed/IODxDxX7oi4",
            workoutText:
              "Einblínum á herðar og tvíhöfðavöðva.\n\n4 × 10 lóðrétt tog\n3 × 12 dýfur (herðar focus)\n3 × 15 brú",
            exerciseIds: ["ex-3", "ex-2", "ex-5"],
          },
          {
            id: "day-2-3",
            title: "Dagur 3 — Fulla líkamsæfing",
            videoUrl: "https://www.youtube.com/embed/IODxDxX7oi4",
            workoutText:
              "Heildar líkamsæfing sem sameinar allt sem við höfum lært.\n\n3 × 10 kassa krær\n3 × 8 lóðrétt tog\n3 × 12 hnéhlykkjur\n3 × brú × 15\n5 mín öndunarmeðvitund að lokum.",
            exerciseIds: ["ex-1", "ex-3", "ex-9", "ex-5", "ex-7"],
          },
        ],
      },
    ],
  },
  {
    id: "course-2",
    slug: "fita-i-fjogur-vikur",
    title: "Fita í fjögur vikur",
    instructor: "Gunnar Þórðarson",
    description:
      "Hröð og skilvirk þyngdartapsáætlun með háþéttni hreyfingum og næringarráðleggingum. Æfðu í 30 mínútur á dag og sjáðu breytinguna á fjórum vikum.",
    price: 8900,
    category: "Þyngdartap",
    coverImage: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80",
    weeks: [
      {
        id: "w1",
        title: "Vika 1 — Ræsing",
        days: [
          {
            id: "day-f-1-1",
            title: "Dagur 1 — Kynning á HIIT",
            videoUrl: "https://www.youtube.com/embed/IODxDxX7oi4",
            workoutText:
              "Við byrjum á þjálfun sem er létt en gefur þér tilfinningu fyrir HIIT sniðmátinu.\n\n5 × 20 sek æðrulegur sprettgangur / 10 sek hvíld\n5 × 20 sek kassa krær / 10 sek hvíld\nEndurtaka 2 sinnum.",
            exerciseIds: ["ex-6", "ex-1"],
            isFreePreview: true,
          },
          {
            id: "day-f-1-2",
            title: "Dagur 2 — Neðri líkami",
            videoUrl: "https://www.youtube.com/embed/IODxDxX7oi4",
            workoutText:
              "Þyngd á neðri líkama og þol.\n\n4 × 15 hnéhlykkjur\n4 × 12 brú\n3 × 30 sek framhliðar útfærsla\n2 × 1 mín öndunarmeðvitund.",
            exerciseIds: ["ex-9", "ex-5", "ex-4", "ex-7"],
          },
          {
            id: "day-f-1-3",
            title: "Dagur 3 — Efri líkami + þol",
            videoUrl: "https://www.youtube.com/embed/IODxDxX7oi4",
            workoutText:
              "Sameinar efri líkama og þolþjálfun.\n\n3 × 12 dýfur\n3 × 10 lóðrétt tog\n4 × 20 sek sprettgangur\n3 × boli kross",
            exerciseIds: ["ex-2", "ex-3", "ex-6", "ex-8"],
          },
        ],
      },
      {
        id: "w2",
        title: "Vika 2 — Magn upp",
        days: [
          {
            id: "day-f-2-1",
            title: "Dagur 1 — HIIT á fullu",
            videoUrl: "https://www.youtube.com/embed/IODxDxX7oi4",
            workoutText:
              "Lengri HIIT lota.\n\n8 × 30 sek sprettgangur / 15 sek hvíld\n4 × 12 kassa krær\n4 × 12 dýfur\nEndurtaka 3 sinnum.",
            exerciseIds: ["ex-6", "ex-1", "ex-2"],
          },
          {
            id: "day-f-2-2",
            title: "Dagur 2 — Þolþjálfun",
            videoUrl: "https://www.youtube.com/embed/IODxDxX7oi4",
            workoutText:
              "Léttara þolþjálfunarform. 30 mínútur stöðugt hreyfing á miðlungs hraða.\n\nGanga/hlaup víxl: 2 mín ganga, 1 mín hlaup × 10\n3 × brú × 15",
            exerciseIds: ["ex-5"],
          },
          {
            id: "day-f-2-3",
            title: "Dagur 3 — Endurnæring & hvíld",
            videoUrl: "https://www.youtube.com/embed/IODxDxX7oi4",
            workoutText:
              "Hvíldardagur með léttum teygingum og öndunarmeðvitund.\n\n5 × 1 mín öndunarmeðvitund\n4 × 30 sek framhliðar útfærsla\n4 × 30 sek framhliðarhnykkur\n3 × boli kross",
            exerciseIds: ["ex-7", "ex-4", "ex-10", "ex-8"],
          },
        ],
      },
    ],
  },
];

export function getCourseBySlug(slug: string): Course | undefined {
  return COURSES.find((c) => c.slug === slug);
}

export function getDayById(
  course: Course,
  dayId: string
): { day: import("@/types").DayLesson; weekTitle: string } | undefined {
  for (const week of course.weeks) {
    const day = week.days.find((d) => d.id === dayId);
    if (day) return { day, weekTitle: week.title };
  }
  return undefined;
}

export function getExerciseById(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}

export const CATEGORIES = [
  "Styrkur",
  "Þyngdartap",
  "Liðleiki & hreyfigeta",
  "Heilsa & endurnæring",
  "Endurhæfing",
] as const;

export const EXERCISE_CATEGORIES = [
  "Styrkur",
  "Þyngdartap",
  "Liðleiki & hreyfigeta",
  "Heilsa & endurnæring",
  "Endurhæfing",
] as const;
