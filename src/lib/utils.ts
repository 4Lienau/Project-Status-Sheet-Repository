/**
 * File: utils.ts
 * Purpose: Utility functions for the application
 * Description: This file contains utility functions used throughout the application. Currently,
 * it includes the 'cn' function which combines class names using clsx and tailwind-merge for
 * efficient Tailwind CSS class composition and conditional styling.
 *
 * Imports from:
 * - clsx for class name composition
 * - tailwind-merge for Tailwind CSS class merging
 *
 * Used by:
 * - Various components throughout the application for class name composition
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
