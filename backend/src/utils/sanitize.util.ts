const sanitizeString = (str: string): string => {
  return str
    .replace(/<script[^>]*>.*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();
};

export const sanitizeObject = (obj: unknown): unknown => {
  if (typeof obj === "string") return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);

  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([key, val]) => [key, sanitizeObject(val)]),
    );
  }

  return obj;
};
