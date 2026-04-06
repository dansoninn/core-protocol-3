"use client";

const PURCHASED_KEY = "cp_purchased";
const COMPLETED_DAYS_KEY = "cp_completed_days";
const ADMIN_USERS_KEY = "cp_admin_users";
const ADMIN_AUTH_KEY = "cp_admin_auth";
const ADMIN_COURSES_KEY = "cp_admin_courses";
const ADMIN_EXERCISES_KEY = "cp_admin_exercises";

export function getPurchasedCourses(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(PURCHASED_KEY) || "[]");
  } catch {
    return [];
  }
}

export function purchaseCourse(courseId: string): void {
  const purchased = getPurchasedCourses();
  if (!purchased.includes(courseId)) {
    localStorage.setItem(PURCHASED_KEY, JSON.stringify([...purchased, courseId]));
  }
}

export function hasPurchased(courseId: string): boolean {
  return getPurchasedCourses().includes(courseId);
}

export function getCompletedDays(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(COMPLETED_DAYS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function toggleDayComplete(dayId: string): void {
  const completed = getCompletedDays();
  if (completed.includes(dayId)) {
    localStorage.setItem(
      COMPLETED_DAYS_KEY,
      JSON.stringify(completed.filter((d) => d !== dayId))
    );
  } else {
    localStorage.setItem(COMPLETED_DAYS_KEY, JSON.stringify([...completed, dayId]));
  }
}

export function isDayComplete(dayId: string): boolean {
  return getCompletedDays().includes(dayId);
}

// Admin users
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export function getAdminUsers(): AdminUser[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(ADMIN_USERS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addAdminUser(user: Omit<AdminUser, "id" | "createdAt">): void {
  const users = getAdminUsers();
  const newUser: AdminUser = {
    ...user,
    id: `user-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(ADMIN_USERS_KEY, JSON.stringify([...users, newUser]));
}

export function deleteAdminUser(id: string): void {
  const users = getAdminUsers().filter((u) => u.id !== id);
  localStorage.setItem(ADMIN_USERS_KEY, JSON.stringify(users));
}

// Admin auth
export function isAdminAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ADMIN_AUTH_KEY) === "true";
}

export function adminLogin(password: string): boolean {
  if (password === "admin123") {
    localStorage.setItem(ADMIN_AUTH_KEY, "true");
    return true;
  }
  return false;
}

export function adminLogout(): void {
  localStorage.removeItem(ADMIN_AUTH_KEY);
}

// Admin-created courses (stored separately)
export function getAdminCourses(): import("@/types").Course[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(ADMIN_COURSES_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveAdminCourse(course: import("@/types").Course): void {
  const courses = getAdminCourses();
  const idx = courses.findIndex((c) => c.id === course.id);
  if (idx >= 0) {
    courses[idx] = course;
  } else {
    courses.push(course);
  }
  localStorage.setItem(ADMIN_COURSES_KEY, JSON.stringify(courses));
}

// Admin-created exercises
export function getAdminExercises(): import("@/types").Exercise[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(ADMIN_EXERCISES_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveAdminExercise(exercise: import("@/types").Exercise): void {
  const exercises = getAdminExercises();
  exercises.push(exercise);
  localStorage.setItem(ADMIN_EXERCISES_KEY, JSON.stringify(exercises));
}
