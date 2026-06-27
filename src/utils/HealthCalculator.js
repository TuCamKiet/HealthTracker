// -----------------------------------------
// Constants
// -----------------------------------------

export const WALKING_MET = {
  VERY_SLOW: 2.0, // <0.67 m/s
  SLOW: 2.8, // 0.67-1.00
  NORMAL: 3.5, // 1.01-1.56
  BRISK: 4.3, // 1.57-1.79
  FAST: 5.0, // >1.79
};

// -----------------------------------------
// Stride Length
// -----------------------------------------

export function calculateStrideLength(heightCm, sex = "male") {
  const heightM = heightCm / 100;

  const ratio = sex === "female" ? 0.413 : 0.415;

  return heightM * ratio;
}

// -----------------------------------------
// Distance
// -----------------------------------------

export function calculateDistance(steps, strideLength) {
  return steps * strideLength;
}

// -----------------------------------------
// Walking Time
// -----------------------------------------

export function calculateWalkingMinutes(seconds) {
  return seconds / 60;
}

// -----------------------------------------
// Speed
// -----------------------------------------

export function calculateSpeed(distanceMeters, walkingSeconds) {
  if (walkingSeconds <= 0) return 0;

  return distanceMeters / walkingSeconds;
}

// -----------------------------------------
// Dynamic MET
// -----------------------------------------

export function calculateMET(speed) {
  if (speed < 0.67) return WALKING_MET.VERY_SLOW;

  if (speed < 1.01) return WALKING_MET.SLOW;

  if (speed < 1.57) return WALKING_MET.NORMAL;

  if (speed < 1.8) return WALKING_MET.BRISK;

  return WALKING_MET.FAST;
}

// -----------------------------------------
// ACSM Calories
// -----------------------------------------

export function calculateCalories(weightKg, walkingSeconds, met) {
  const kcal = (walkingSeconds * met * 3.5 * weightKg) / (200 * 60);

  return Number(kcal.toFixed(2));
}

// -----------------------------------------
// Entire Pipeline
// -----------------------------------------

export function calculateWalkingStats({
  steps,
  height,
  weight,
  sex,
  walkingSeconds,
}) {
  const strideLength = calculateStrideLength(height, sex);

  const distanceMeters = calculateDistance(steps, strideLength);

  const speed = calculateSpeed(distanceMeters, walkingSeconds);

  const met = calculateMET(speed);

  const calories = calculateCalories(weight, walkingSeconds, met);

  return {
    strideLength,
    distanceMeters,
    speed,
    met,
    calories,
  };
}
