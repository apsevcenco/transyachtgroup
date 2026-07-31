export function nextGlobalContractSequence(
  contractNumbers: readonly string[],
): number {
  let maxSequence = 0;
  for (const contractNumber of contractNumbers) {
    const match = contractNumber.match(/-(\d+)$/);
    if (match) {
      maxSequence = Math.max(maxSequence, Number.parseInt(match[1], 10));
    }
  }
  return maxSequence + 1;
}
