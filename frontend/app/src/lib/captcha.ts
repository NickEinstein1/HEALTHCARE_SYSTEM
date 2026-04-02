export function newCaptchaChallenge(): { a: number; b: number; answer: number; question: string } {
  const a = Math.floor(Math.random() * 15) + 1;
  const b = Math.floor(Math.random() * 15) + 1;
  return { a, b, answer: a + b, question: `${a} + ${b} = ?` };
}
