import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { GoogleGenerativeAI } from '@google/generative-ai'

function readRequestBody(req, limitBytes = 25 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let total = 0
    const chunks = []

    req.on('data', (chunk) => {
      total += chunk.length
      if (total > limitBytes) {
        const err = new Error('Payload too large.')
        err.statusCode = 413
        reject(err)
        req.destroy()
        return
      }
      chunks.push(chunk)
    })

    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'))
    })

    req.on('error', reject)
  })
}

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}

const DEFAULT_TRYON_MODELS = [
  // Nano Banana Pro — best for studio-quality, contextual edits (try-on).
  'gemini-3-pro-image-preview',
  // Nano Banana 2 — fast, high-quality fallback.
  'gemini-3.1-flash-image-preview',
  // Nano Banana — widely available fallback.
  'gemini-2.5-flash-image',
]

function geminiTryOnBackend(apiKey, tryOnModels = DEFAULT_TRYON_MODELS) {
  return {
    name: 'gemini-tryon-backend',
    configureServer(server) {
      server.middlewares.use('/api/tryon', async (req, res) => {
        if (req.method !== 'POST') {
          return sendJson(res, 405, { error: 'Method not allowed.' })
        }

        if (!apiKey) {
          return sendJson(res, 500, {
            error: 'Server missing GEMINI_API_KEY.',
          })
        }

        try {
          const raw = await readRequestBody(req)
          const body = raw ? JSON.parse(raw) : {}
          const { productImage, customerImage } = body || {}

          if (
            !productImage?.mimeType ||
            !productImage?.data ||
            !customerImage?.mimeType ||
            !customerImage?.data
          ) {
            return sendJson(res, 400, {
              error: 'Invalid request. Expected productImage and customerImage inlineData.',
            })
          }

          const genAI = new GoogleGenerativeAI(apiKey)
          // Image output via `generateContent` + `responseModalities: IMAGE`.
          // Some accounts/models are available only on `v1` while the SDK defaults to `v1beta`.
          const apiVersions = ['v1', 'v1beta']
          let lastErr = null

          const prompt = `Virtual try-on (fashion).

You are given two images in this order:
1) PRODUCT image — the clothing, outfit, or garment to use (product shot, model wearing the item, mannequin, or flat lay).
2) USER image — the person who should wear that clothing.

Task:
• From the PRODUCT image, identify the clothing only: garment type, colors, patterns, cut, and fabric look.
• Put that exact outfit onto the person in the USER image: replace their visible clothes with this outfit so they are dressed in it properly, naturally, and beautifully.
• The result should look like a real photo: correct fit, drape, seams, folds, shadows, and lighting consistent with the USER photo.
• Preserve the person’s identity: keep their face, hair, skin tone, body shape, pose, and the background from the USER image when possible.
• Output one photorealistic, high-quality fashion image — the user wearing the product in a polished, appealing way.

Generate only the final try-on image.`

          let result = null
          outer: for (const modelName of tryOnModels) {
            for (const apiVersion of apiVersions) {
              try {
                const model = genAI.getGenerativeModel(
                  { model: modelName },
                  { apiVersion },
                )

                result = await model.generateContent({
                  contents: [
                    {
                      role: 'user',
                      parts: [
                        { text: prompt },
                        { inlineData: productImage },
                        { inlineData: customerImage },
                      ],
                    },
                  ],
                  generationConfig: {
                    responseModalities: ['TEXT', 'IMAGE'],
                  },
                })
                break outer
              } catch (err) {
                lastErr = err
              }
            }
          }

          if (!result) {
            const baseMsg = lastErr?.message || 'Gemini try-on failed.'
            throw new Error(
              `Gemini try-on failed (models tried: ${tryOnModels.join(
                ', ',
              )}; apiVersion: ${apiVersions.join(', ')}). ${baseMsg}`,
            )
          }

          const response = result.response
          const parts = response.candidates?.[0]?.content?.parts || []

          for (const part of parts) {
            if (part.inlineData?.mimeType?.startsWith('image/')) {
              const mimeType = part.inlineData.mimeType
              const data = part.inlineData.data
              return sendJson(res, 200, {
                mimeType,
                data,
                dataUrl: `data:${mimeType};base64,${data}`,
              })
            }
          }

          const textPart = parts.find((p) => p.text)
          return sendJson(res, 500, {
            error:
              textPart?.text ||
              'Gemini did not return an image. Please try with clearer, well-lit images.',
          })
        } catch (err) {
          const statusCode = err?.statusCode || 500
          return sendJson(res, statusCode, { error: err?.message || 'Try-on failed.' })
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || ''
  const modelOverride = env.GEMINI_TRYON_MODEL?.trim()
  const tryOnModels = modelOverride
    ? modelOverride.split(',').map((s) => s.trim()).filter(Boolean)
    : DEFAULT_TRYON_MODELS

  return {
    plugins: [react(), geminiTryOnBackend(apiKey, tryOnModels)],
  }
})
