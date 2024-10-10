export function useUnsavedChange(callback: () => string | null | undefined | false, confirm = window.confirm.bind(window)) {
  onBeforeRouteLeave((to, from, next) => {
    let answer = true
    const message = callback()
    if (message) {
      answer = confirm(message)
    }
    next(answer)
  })
  useEventListener(window, 'beforeunload', (event) => {
    if (callback()) {
      event.preventDefault()
    }
  })
}
