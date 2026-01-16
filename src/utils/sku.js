export function generateSKU(productObj) {
  // Ensure inputs are strings
  const safeString = (value, defaultValue = "X") =>
    typeof value === "string" && value.trim().length > 0 ? value : defaultValue;


  const cleanProductName = safeString(productObj.productName)
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(" ")
    .map(word => word.substring(0, 1).toUpperCase())
    .join("")


  let variantCode = "STD"; // default

  const colorCode = safeString(productObj.color, "");
  const sizeCode = safeString(productObj.size, "");
  if (colorCode || sizeCode) {
    variantCode = [colorCode, sizeCode]
      .filter(Boolean)
      .map((v) => v.substring(0, 3).toUpperCase())
      .join("-");
  }

  const timestamp = Date.now();
  const randomCode = Math.random().toString(36).substring(2, 5).toUpperCase();

  return `SNR-${cleanProductName}-${variantCode}-${timestamp}-${randomCode}`;
}
