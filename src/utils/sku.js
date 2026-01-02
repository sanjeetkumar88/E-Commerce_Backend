export function generateSKU(productName, color, size) {
  // Ensure inputs are strings
  const safeString = (value, defaultValue = "X") =>
    typeof value === "string" && value.trim().length > 0 ? value : defaultValue;

  const cleanProductName = safeString(productName)
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 3)
    .toUpperCase();

  let variantCode = "STD"; // default

  const colorCode = safeString(color, "");
  const sizeCode = safeString(size, "");

  if (colorCode || sizeCode) {
    variantCode = [colorCode, sizeCode]
      .filter(Boolean)
      .map((v) => v.substring(0, 3).toUpperCase())
      .join("-");
  }

  const timestamp = Date.now();
  const randomCode = Math.random().toString(36).substring(2, 5).toUpperCase();

  return `${cleanProductName}-${variantCode}-${timestamp}-${randomCode}`;
}
