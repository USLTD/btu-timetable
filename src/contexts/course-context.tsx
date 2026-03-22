import { createContext } from "preact";
import { useContext } from "preact/hooks";
import { globalCourses } from "@/store";
import type { Course } from "@/lib/types";

interface CourseContextType {
  courses: Course[];
  setCourses: (courses: Course[] | ((prev: Course[]) => Course[])) => void;
  addCourse: (course: Course) => void;
  removeCourse: (courseName: string) => void;
  updateCourse: (index: number, course: Course) => void;
  toggleCourse: (index: number) => void;
  duplicateCourse: (courseName: string) => void;
  reorderCourses: (reordered: Course[]) => void;
}

const CourseContext = createContext<CourseContextType | null>(null);

export function CourseProvider({ children }: { children: preact.ComponentChildren }) {
  const setCourses = (courses: Course[] | ((prev: Course[]) => Course[])) => {
    globalCourses.value = typeof courses === "function" ? courses(globalCourses.value) : courses;
  };

  const addCourse = (course: Course) => {
    globalCourses.value = [...globalCourses.value, course];
  };

  const removeCourse = (courseName: string) => {
    globalCourses.value = globalCourses.value.filter((c) => c.courseName !== courseName);
  };

  const updateCourse = (index: number, course: Course) => {
    globalCourses.value = globalCourses.value.map((c, i) => i === index ? course : c);
  };

  const toggleCourse = (index: number) => {
    globalCourses.value = globalCourses.value.map((c, i) => 
      i === index ? { ...c, isActive: !c.isActive } : c
    );
  };

  const duplicateCourse = (courseName: string) => {
    const courses = globalCourses.value;
    const idx = courses.findIndex((c) => c.courseName === courseName);
    if (idx === -1) return;
    
    const existingNames = courses.map((c) => c.courseName);
    const source = courses[idx];
    const buildDuplicateName = (name: string, existing: string[]) => {
      let counter = 1;
      let newName = `${name} (${counter})`;
      while (existing.includes(newName)) {
        counter++;
        newName = `${name} (${counter})`;
      }
      return newName;
    };
    
    const duplicate: Course = {
      ...source,
      courseName: buildDuplicateName(source.courseName, existingNames),
      groups: source.groups.map((g) => ({
        ...g,
        times: g.times.map((t) => ({ ...t })),
      })),
      excludedGroups: source.excludedGroups ? [...source.excludedGroups] : [],
      order: courses.length,
    };
    
    globalCourses.value = [...courses, duplicate];
  };

  const reorderCourses = (reordered: Course[]) => {
    globalCourses.value = reordered;
  };

  return (
    <CourseContext.Provider value={{
      courses: globalCourses.value,
      setCourses,
      addCourse,
      removeCourse,
      updateCourse,
      toggleCourse,
      duplicateCourse,
      reorderCourses,
    }}>
      {children}
    </CourseContext.Provider>
  );
}

export function useCourse() {
  const context = useContext(CourseContext);
  if (!context) {
    throw new Error("useCourse must be used within a CourseProvider");
  }
  return context;
}
