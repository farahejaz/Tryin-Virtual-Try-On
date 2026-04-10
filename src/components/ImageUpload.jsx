import { useRef, useState, useCallback } from 'react'

export default function ImageUpload({ label, description, number, image, onImageChange }) {
  const inputRef = useRef(null)
  const changeRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => onImageChange({ file, dataUrl: e.target.result })
    reader.readAsDataURL(file)
  }, [onImageChange])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  return (
    <div className="upload-card">
      <div className="card-header">
        <div className="card-num">{number}</div>
        <div className="card-label">
          <h3>{label}</h3>
          <p>{description}</p>
        </div>
        {image && (
          <button className="card-clear" onClick={() => onImageChange(null)} title="Remove">
            ✕
          </button>
        )}
      </div>

      {!image ? (
        <div
          className={`drop-zone${dragOver ? ' drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFile(e.target.files[0])}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="drop-icon">📸</div>
          <p className="drop-text-main">
            Drop image or <span>browse</span>
          </p>
          <p className="drop-text-sub">PNG, JPG, WEBP — up to 10 MB</p>
        </div>
      ) : (
        <div className="preview-wrap">
          <img src={image.dataUrl} alt={label} className="preview-img" />
          <div className="preview-overlay">
            <button
              className="preview-change-btn"
              onClick={() => changeRef.current?.click()}
            >
              Change Image
            </button>
            <input
              ref={changeRef}
              type="file"
              accept="image/*"
              className="preview-change-input"
              onChange={(e) => handleFile(e.target.files[0])}
            />
          </div>
        </div>
      )}
    </div>
  )
}
