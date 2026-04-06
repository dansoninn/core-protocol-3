import { EXERCISES } from "@/lib/data";
import ExercisesClient from "./ExercisesClient";

export default function ExercisesPage() {
  return <ExercisesClient exercises={EXERCISES} />;
}
