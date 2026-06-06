/** Interactive arrow-key selector for CLI */

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";

export async function select(question: string, opts: string[]): Promise<number> {
  if (opts.length === 0) return -1;
  const canRaw = process.stdin.isTTY && typeof process.stdin.setRawMode === "function";

  if (!canRaw) {
    console.log(`  ${CYAN}?${RESET} ${question}`);
    for (let i = 0; i < opts.length; i++) {
      console.log(`  ${DIM}${i + 1})${RESET} ${opts[i]}`);
    }
    while (true) {
      const a = prompt(`  ${CYAN}>${RESET} Enter number (1-${opts.length}):`);
      const n = parseInt(a ?? "", 10);
      if (n >= 1 && n <= opts.length) return n - 1;
    }
  }

  let sel = 0;

  const render = () => {
    process.stdout.write(`\x1b[${opts.length}A`);
    for (let i = 0; i < opts.length; i++) {
      const pre = i === sel ? `${CYAN}❯${RESET} ` : `  `;
      const lbl = i === sel ? `${BOLD}${opts[i]}${RESET}` : `${DIM}${opts[i]}${RESET}`;
      process.stdout.write(`\x1b[2K  ${pre}${lbl}\n`);
    }
  };

  console.log(`  ${CYAN}?${RESET} ${question} ${DIM}(arrow keys)${RESET}`);
  for (let i = 0; i < opts.length; i++) {
    const pre = i === sel ? `${CYAN}❯${RESET} ` : `  `;
    const lbl = i === sel ? `${BOLD}${opts[i]}${RESET}` : `${DIM}${opts[i]}${RESET}`;
    console.log(`  ${pre}${lbl}`);
  }

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  return new Promise<number>((resolve) => {
    const onData = (key: string) => {
      if (key === "\x1b[A") { sel = (sel - 1 + opts.length) % opts.length; render(); }
      else if (key === "\x1b[B") { sel = (sel + 1) % opts.length; render(); }
      else if (key === "\r" || key === "\n") { cleanup(); resolve(sel); }
      else if (key === "\x03") { cleanup(); process.exit(0); }
    };
    const cleanup = () => {
      process.stdin.removeListener("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    };
    process.stdin.on("data", onData);
  });
}
