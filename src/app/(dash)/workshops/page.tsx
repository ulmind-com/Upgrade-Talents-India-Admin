"use client";
import LearnPage from "@/components/LearnPage";
import { workshopsApi } from "@/lib/api";
export default function WorkshopsPage() { return <LearnPage api={workshopsApi} kind="workshop" />; }
