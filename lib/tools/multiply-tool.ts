export type MultiplyToolArgs = {
  a: number;
  b: number;
};

export function runMultiplyTool(args: MultiplyToolArgs): { result: number } {
  return {
    result: args.a * args.b,
  };
}
