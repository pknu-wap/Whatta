import { http } from '@/lib/http'

export type SignedUploadIntent = 'AGENT_IMAGE'

export type SignedUploadRequest = {
  intent: SignedUploadIntent
  target?: SignedUploadIntent
  contentType: string
}

export type SignedUploadData = {
  objectKey: string
  signedUrl: string
  httpMethod: string
  expiresInSeconds: number
  requiredHeaders: Record<string, string>
}

export type SignedUploadResponse = {
  statusCode: string
  message: string
  data: SignedUploadData
}

const SIGNED_UPLOAD_PATH = '/image/upload'

export async function requestSignedUpload(
  payload: SignedUploadRequest,
): Promise<SignedUploadData> {
  const { data } = await http.post<SignedUploadResponse>(SIGNED_UPLOAD_PATH, payload)
  return data.data
}

export async function uploadToSignedUrl(params: {
  signedUrl: string
  httpMethod?: string
  requiredHeaders?: Record<string, string>
  contentType: string
  body: Blob
}) {
  const method = (params.httpMethod || 'PUT').toUpperCase()
  const headers = {
    ...(params.requiredHeaders ?? {}),
    'Content-Type': params.contentType,
  }

  const response = await fetch(params.signedUrl, {
    method,
    headers,
    body: params.body,
  })

  if (!response.ok) {
    throw new Error(`Signed upload failed: ${response.status}`)
  }
}
