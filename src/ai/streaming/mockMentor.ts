export const streamMentorMessage = (
  message: string,
  onChunk: (value: string) => void,
  onDone: () => void
) => {
  let index = 0;
  const interval = window.setInterval(() => {
    index += Math.max(1, Math.floor(message.length / 18));
    onChunk(message.slice(0, index));
    if (index >= message.length) {
      window.clearInterval(interval);
      onDone();
    }
  }, 40);
  return () => window.clearInterval(interval);
};
