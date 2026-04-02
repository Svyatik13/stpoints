const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  gray: '\x1b[90m',
};

function timestamp(): string {
  return new Date().toISOString();
}

export const logger = {
  info: (message: string, data?: any) => {
    console.log(`${colors.cyan}[INFO]${colors.reset} ${colors.gray}${timestamp()}${colors.reset} ${message}`, data ?? '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`${colors.yellow}[WARN]${colors.reset} ${colors.gray}${timestamp()}${colors.reset} ${message}`, data ?? '');
  },
  error: (message: string, data?: any) => {
    console.error(`${colors.red}[ERROR]${colors.reset} ${colors.gray}${timestamp()}${colors.reset} ${message}`, data ?? '');
  },
  success: (message: string, data?: any) => {
    console.log(`${colors.green}[OK]${colors.reset} ${colors.gray}${timestamp()}${colors.reset} ${message}`, data ?? '');
  },
  mining: (message: string, data?: any) => {
    console.log(`${colors.yellow}[MINING]${colors.reset} ${colors.gray}${timestamp()}${colors.reset} ⛏️  ${message}`, data ?? '');
  },
  giveaway: (message: string, data?: any) => {
    console.log(`${colors.green}[GIVEAWAY]${colors.reset} ${colors.gray}${timestamp()}${colors.reset} 🎁 ${message}`, data ?? '');
  },
};
