import process from 'node:process'

export enum ExitCode {
  Success = 0,
  FatalError = 1,
  InvalidArgument = 9,
}

export function handleArgsError(error: Error): never {
  console.error(error.message)
  return process.exit(ExitCode.InvalidArgument)
}
