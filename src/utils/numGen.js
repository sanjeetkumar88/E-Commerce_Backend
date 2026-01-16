let counter = 0;

export function generate16DigitId() {
  const timestamp = Date.now().toString(); 
  const tsPart = timestamp.slice(-13); 

  const randomPart = Math.floor(Math.random() * 9); 

  counter = (counter + 1) % 10;

  const extraRandom = Math.floor(Math.random() * 9);

  return Number(`${tsPart}${randomPart}${counter}${extraRandom}`);
}
let lastId = 0;
export function generate9DigitId() {
  const seconds = Math.floor(Date.now() / 1000); // epoch seconds
  const base = seconds % 1_000_000_000; // force 9 digits

  // ensure monotonic increase even in same second
  if (base <= lastId) {
    lastId = lastId + 1;
  } else {
    lastId = base;
  }

  return lastId;
}

