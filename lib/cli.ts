const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const MAGENTA = "\x1b[35m";
const WHITE = "\x1b[37m";

export function banner() {
  console.log("");
  console.log(`${CYAN}${BOLD}  Design System Clone${RESET}`);
  console.log(`${DIM}  Extract any website's design system into a reusable spec${RESET}`);
  console.log("");
}

export function stepHeader(step: number, total: number, message: string) {
  console.log("");
  console.log(`${MAGENTA}${BOLD}  [${step}/${total}]${RESET} ${BOLD}${message}${RESET}`);
  console.log(`${DIM}  ${"─".repeat(50)}${RESET}`);
}

export function success(message: string) {
  console.log(`  ${GREEN}✓${RESET} ${message}`);
}

export function info(message: string) {
  console.log(`  ${CYAN}│${RESET} ${message}`);
}

export function warn(message: string) {
  console.log(`  ${YELLOW}⚠${RESET} ${message}`);
}

export function error(message: string, exit = false) {
  console.log(`  ${RED}✗${RESET} ${message}`);
  if (exit) process.exit(1);
}

export function ask(question: string): string {
  while (true) {
    const answer = prompt(`  ${CYAN}?${RESET} ${question}`);
    if (answer && answer.trim().length > 0) return answer.trim();
    warn("Please provide a non-empty answer.");
  }
}

export function waitForEnter(message = "Press Enter to continue...") {
  prompt(`  ${DIM}${message}${RESET}`);
}

/**
 * Interactive arrow-key selector. Returns the index of the selected option.
 * Uses raw stdin for arrow keys when available, falls back to numbered input.
 */
export async function select(
  question: string,
  options: string[]
): Promise<number> {
  if (options.length === 0) return -1;

  // Check if raw mode is available (not available when stdin is piped)
  const canUseRawMode =
    process.stdin.isTTY && typeof process.stdin.setRawMode === "function";

  if (!canUseRawMode) {
    // Fallback: numbered list with prompt
    console.log(`  ${CYAN}?${RESET} ${question}`);
    for (let i = 0; i < options.length; i++) {
      console.log(`  ${DIM}${i + 1})${RESET} ${options[i]}`);
    }
    while (true) {
      const answer = prompt(`  ${CYAN}>${RESET} Enter number (1-${options.length}):`);
      const num = parseInt(answer ?? "", 10);
      if (num >= 1 && num <= options.length) return num - 1;
      warn("Invalid choice. Try again.");
    }
  }

  let selected = 0;

  const render = () => {
    process.stdout.write(`\x1b[${options.length}A`);
    for (let i = 0; i < options.length; i++) {
      const prefix = i === selected ? `${CYAN}❯${RESET} ` : `  `;
      const label =
        i === selected
          ? `${BOLD}${options[i]}${RESET}`
          : `${DIM}${options[i]}${RESET}`;
      process.stdout.write(`\x1b[2K  ${prefix}${label}\n`);
    }
  };

  console.log(`  ${CYAN}?${RESET} ${question} ${DIM}(use arrow keys)${RESET}`);

  for (let i = 0; i < options.length; i++) {
    const prefix = i === selected ? `${CYAN}❯${RESET} ` : `  `;
    const label =
      i === selected
        ? `${BOLD}${options[i]}${RESET}`
        : `${DIM}${options[i]}${RESET}`;
    console.log(`  ${prefix}${label}`);
  }

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  return new Promise<number>((resolve) => {
    const onData = (key: string) => {
      if (key === "\x1b[A") {
        selected = (selected - 1 + options.length) % options.length;
        render();
      } else if (key === "\x1b[B") {
        selected = (selected + 1) % options.length;
        render();
      } else if (key === "\r" || key === "\n") {
        cleanup();
        resolve(selected);
      } else if (key === "\x03") {
        cleanup();
        process.exit(0);
      }
    };

    const cleanup = () => {
      process.stdin.removeListener("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    };

    process.stdin.on("data", onData);
  });
}
