/**
 * Helper function to extract string from nested description objects
 */
export const extractStringFromNestedObject = (item: any): string => {
  console.log("extractStringFromNestedObject called with:", item);

  // If it's already a string, return it
  if (typeof item === "string") {
    console.log("Item is already a string:", item);
    return item;
  }

  // If it's an object with a description property
  if (typeof item === "object" && item !== null) {
    console.log("Item is an object:", item);

    // If it has a description property that's a string, return that
    if (typeof item.description === "string") {
      console.log("Found string description:", item.description);
      return item.description;
    }

    // If it has a description property that's an object, recursively extract from it
    if (typeof item.description === "object" && item.description !== null) {
      console.log("Found nested object description:", item.description);
      return extractStringFromNestedObject(item.description);
    }

    // If we couldn't extract a string, convert the object to a string
    console.log("Converting object to string:", item);
    return JSON.stringify(item);
  }

  // For any other type, convert to string
  console.log("Converting non-object to string:", item);
  return String(item || "");
};

/**
 * Helper function to ensure considerations are always stored as simple strings
 */
export const ensureConsiderationsAreStrings = (
  considerations: any[],
): string[] => {
  if (!considerations || !Array.isArray(considerations)) {
    console.log(
      "ensureConsiderationsAreStrings: considerations is not an array",
      considerations,
    );
    return [];
  }

  console.log("ensureConsiderationsAreStrings input:", considerations);
  const result = considerations.map((item) => {
    // Handle objects with description property
    if (item && typeof item === "object" && item !== null) {
      // If it has a description property that's a string, return that
      if (typeof item.description === "string") {
        return item.description;
      }
      // If it has a description property that's an object, try to stringify it
      if (typeof item.description === "object" && item.description !== null) {
        try {
          return JSON.stringify(item.description);
        } catch (e) {
          return "";
        }
      }
      // If no description property but it's an object, try to stringify it
      try {
        return JSON.stringify(item);
      } catch (e) {
        return "";
      }
    }
    // If it's already a string, return it
    if (typeof item === "string") {
      return item;
    }
    // For any other case, try to convert to string
    try {
      return String(item || "");
    } catch (e) {
      return "";
    }
  });
  console.log("ensureConsiderationsAreStrings output:", result);
  return result;
};
