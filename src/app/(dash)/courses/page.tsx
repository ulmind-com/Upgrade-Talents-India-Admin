"use client";
import LearnPage from "@/components/LearnPage";
import { coursesApi } from "@/lib/api";
export default function CoursesPage() { return <LearnPage api={coursesApi} kind="course" />; }
