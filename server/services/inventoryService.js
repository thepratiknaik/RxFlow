/**
 * Threshold: stock is "low" when on-hand quantity is strictly below the configured minimum.
 */
export const isBelowMinimumLevel = (quantityOnHand, minimumLevel) => {
  const q = Number(quantityOnHand);
  const m = Number(minimumLevel);
  if (!Number.isFinite(q) || !Number.isFinite(m)) {
    return false;
  }
  return q < m;
};

export const enrichInventoryLot = (lotPlain) => {
  const quantityOnHand = lotPlain.quantityOnHand;
  const minimumLevel = lotPlain.minimumLevel;
  const belowThreshold = isBelowMinimumLevel(quantityOnHand, minimumLevel);

  return {
    ...lotPlain,
    belowThreshold,
    thresholdDelta: belowThreshold
      ? Number(minimumLevel) - Number(quantityOnHand)
      : 0,
  };
};

export const drugDisplayName = (drug) => {
  if (!drug) {
    return "";
  }

  return (
    drug.brandname ||
    drug.genericname ||
    drug.productndc ||
    "Drug"
  );
};
