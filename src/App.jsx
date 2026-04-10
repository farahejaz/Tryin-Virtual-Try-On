import { useState, useCallback } from 'react'
import ImageUpload from './components/ImageUpload.jsx'

/* ─── Gemini helper ─────────────────────────────────── */
function getMimeType(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+);/)
  return match ? match[1] : 'image/jpeg'
}

function dataUrlToInlineData(dataUrl) {
  // dataUrl = "data:image/jpeg;base64,XXXX..."
  const data = dataUrl.split(',')[1]
  return { mimeType: getMimeType(dataUrl), data }
}

async function callTryOnBackend(productImage, customerImage) {
  const res = await fetch('/api/tryon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productImage, customerImage }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Try-on request failed (${res.status}).`)
  }

  return await res.json()
}

/* ─── App ───────────────────────────────────────────── */
export default function App() {
  const [productImage, setProductImage] = useState(null)
  const [customerImage, setCustomerImage] = useState(null)
  const [resultImage, setResultImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canTryOn = productImage && customerImage && !loading

  const handleTryOn = useCallback(async () => {
    if (!canTryOn) return
    setError('')
    setResultImage(null)
    setLoading(true)

    try {
      const productInline = dataUrlToInlineData(productImage.dataUrl)
      const customerInline = dataUrlToInlineData(customerImage.dataUrl)
      const result = await callTryOnBackend(productInline, customerInline)
      setResultImage(result)
    } catch (err) {
      console.error(err)
      let msg = err.message || 'Something went wrong.'
      if (msg.includes('SAFETY') || msg.includes('safety')) {
        msg = 'The images were blocked by Gemini safety filters. Please use appropriate fashion/clothing images.'
      } else if (msg.includes('quota') || msg.includes('429')) {
        msg = 'API quota exceeded. Please check your Gemini API usage limits.'
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [canTryOn, productImage, customerImage])

  const handleDownload = () => {
    if (!resultImage) return
    const a = document.createElement('a')
    a.href = resultImage.dataUrl
    a.download = 'tryin-result.png'
    a.click()
  }

  const handleReset = () => {
    setProductImage(null)
    setCustomerImage(null)
    setResultImage(null)
    setError('')
  }

  return (
    <div className="app-wrapper">
      {/* ── Header ── */}
      <header className="site-header">
        <div className="logo">Tryin<span>.</span></div>
        <div className="header-tagline">Virtual Try‑On Experience</div>
        <div className="header-badge">AI Powered</div>
      </header>

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-eyebrow">Powered by Google Gemini</div>
        <h1 className="hero-title">
          Wear it before<br />
          you <em>buy it.</em>
        </h1>
        <p className="hero-subtitle">
          Upload any outfit and your photo. Our AI instantly dresses you in the look — no fitting room needed.
        </p>
      </section>

      {/* ── Main ── */}
      <main className="main-content">

        {/* How it works */}
        <div className="how-strip">
          <div className="how-step">
            <div className="how-step-num">01</div>
            <div className="how-step-text">
              <strong>Upload Outfit</strong>
              Product or model photo
            </div>
          </div>
          <div className="how-step">
            <div className="how-step-num">02</div>
            <div className="how-step-text">
              <strong>Upload Your Photo</strong>
              Clear full-body or half-body
            </div>
          </div>
          <div className="how-step">
            <div className="how-step-num">03</div>
            <div className="how-step-text">
              <strong>AI Try‑On</strong>
              Gemini swaps the outfit onto you
            </div>
          </div>
          <div className="how-step">
            <div className="how-step-num">04</div>
            <div className="how-step-text">
              <strong>Download</strong>
              Save your virtual look
            </div>
          </div>
        </div>

        {/* Error */}
        {error && <div className="error-bar">⚠ {error}</div>}

        {/* Upload cards */}
        <div className="upload-grid">
          <ImageUpload
            number="I"
            label="Product / Model Image"
            description="The outfit you want to try on"
            image={productImage}
            onImageChange={setProductImage}
          />
          <ImageUpload
            number="II"
            label="Your Photo"
            description="A clear photo of yourself"
            image={customerImage}
            onImageChange={setCustomerImage}
          />
        </div>

        {/* CTA */}
        <div className="cta-section">
          <button
            className="try-on-btn"
            onClick={handleTryOn}
            disabled={!canTryOn}
          >
            <span className="btn-inner">
              {loading ? (
                <>
                  <span className="btn-spinner" />
                  Generating…
                </>
              ) : (
                <>
                  ✦ Try On
                </>
              )}
            </span>
          </button>

          {!productImage || !customerImage ? (
            <p className="cta-hint">Upload both images to continue</p>
          ) : null}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="result-section">
            <div className="loading-overlay">
              <div className="loading-ring" />
              <p className="loading-text">Creating your look…</p>
              <p className="loading-subtext">Gemini AI is styling you — this takes ~15 seconds</p>
            </div>
          </div>
        )}

        {/* Result */}
        {resultImage && !loading && (
          <div className="result-section">
            <h2 className="result-title">Your <em>Try‑On</em> Result</h2>
            <div className="result-card">
              <div className="result-img-wrap">
                <img
                  src={resultImage.dataUrl}
                  alt="Virtual try-on result"
                  className="result-img"
                />
                <div className="result-ribbon">AI Generated</div>
              </div>
              <div className="result-footer">
                <span className="result-footer-text">
                  Generated by Gemini · Tryin.
                </span>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="download-btn"
                    onClick={handleReset}
                    style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}
                  >
                    ↺ New Try‑On
                  </button>
                  <button className="download-btn" onClick={handleDownload}>
                    ↓ Download
                  </button>
                </div>
              </div>
            </div>

            <p className="status-note">
              <strong>Tips for better results:</strong> Use well-lit, front-facing photos with a clear view of the clothing.
              Full-body or upper-body shots work best. The AI preserves your face, pose, and background.
            </p>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="site-footer">
        <div className="footer-logo">Tryin<span>.</span></div>
        <span>Powered by Google Gemini AI</span>
        <span>© 2025 Tryin. All rights reserved.</span>
      </footer>
    </div>
  )
}
