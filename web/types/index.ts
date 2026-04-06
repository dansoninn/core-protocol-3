export type Category =
  | "Styrkur"
  | "Þyngdartap"
  | "Liðleiki & hreyfigeta"
  | "Heilsa & endurnæring"
  | "Endurhæfing";

export interface Exercise {
  id: string;
  name: string;
  category: Category;
  description: string;
  videoUrl: string;
}

export interface DayLesson {
  id: string;
  title: string;
  videoUrl: string;
  workoutText: string;
  exerciseIds: string[];
  isFreePreview?: boolean;
}

export interface Week {
  id: string;
  title: string;
  days: DayLesson[];
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  instructor: string;
  description: string;
  price: number;
  category: Category;
  coverImage: string;
  weeks: Week[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  purchasedCourses: string[];
}
