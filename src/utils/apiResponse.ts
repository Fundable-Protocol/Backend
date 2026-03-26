import type { Response } from "express"

export type ApiErrorPayload = {
  code: string
  message: string
  details?: Record<string, unknown>
}

export const sendSuccess = <T>(res: Response, data: T, status = 200) => {
  return res.status(status).json({
    success: true,
    data,
  })
}

export const sendError = (res: Response, status: number, error: ApiErrorPayload) => {
  return res.status(status).json({
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details ?? {},
    },
  })
}

