export function useNumberFormat(
  value: MaybeRef<number | string> | ComputedRef<number | string>,
  options?: {
    locales?: Intl.LocalesArgument
  } & Intl.NumberFormatOptions,
) {
  const opts = {
    locales: options?.locales ?? 'en-US',
    ...options,
  }

  const formatter = new Intl.NumberFormat(opts.locales, opts)
  const val = toRef(value)

  return computed(() => {
    const parsedNum = Number.parseFloat(val.value as string)
    if (Number.isNaN(parsedNum)) {
      return formatter.format(0)
    }

    return formatter.format(parsedNum)
  })
}

export function useKiloBytesNumberFormat(
  value: MaybeRef<number | string> | ComputedRef<number | string>,
  options?: {
    locales?: Intl.LocalesArgument
  } & Intl.NumberFormatOptions,
) {
  return useNumberFormat(value, {
    ...options,
    style: 'unit',
    unit: 'kilobyte',
  })
}
