export function printTitle(title: string): void {
  console.log(`\n=== ${title} ===\n`);
}

export function printJson(label: string, value: unknown): void {
  console.log(`${label}:`);
  console.log(JSON.stringify(value, null, 2));
  console.log("");
}

export function printText(label: string, value: string): void {
  console.log(`${label}:`);
  console.log(value);
  console.log("");
}
