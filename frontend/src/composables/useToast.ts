import { toast as sonnerToast } from 'vue-sonner'
import 'vue-sonner/style.css'

export const toast = {
  success(message: string) {
    sonnerToast.success(message)
  },
  error(message: string) {
    sonnerToast.error(message)
  },
  warning(message: string) {
    sonnerToast.warning(message)
  },
  info(message: string) {
    sonnerToast(message)
  },
}

const pendingConfirm = ref<{ message: string; resolve: (value: boolean) => void } | null>(null)

export function useConfirm() {
  function confirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      pendingConfirm.value = { message, resolve }
    })
  }

  function respond(value: boolean) {
    if (pendingConfirm.value) {
      pendingConfirm.value.resolve(value)
      pendingConfirm.value = null
    }
  }

  return { pendingConfirm, confirm, respond }
}
