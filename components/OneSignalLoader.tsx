"use client";
import { useEffect } from "react";
import { loadOneSignal } from "../lib/onesignal";

export default function OneSignalLoader() {
  useEffect(() => {
    loadOneSignal();
  }, []);
  return null;
}
