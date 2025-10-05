import React, { useCallback } from "react";
import "./index.css";

// Professional portfolio grid selector with image upload and pricing (5 slots per row)
// Props:
// - value: { rows: Array<{ images: string[], price: string }> }
// - onChange(nextValue)
// - title?: string
// - maxRows?: number
// - minRows?: number
// - disabled?: boolean
// - isPremium?: boolean (shows all 5 slots if true, only 3 if false)

const defaultValue = {
  rows: [
    { images: Array(5).fill(null), price: "" },

  ],
};

function ProjectsPortfolioSelector({
  value = defaultValue,
  onChange,
  title = "Projects Portfolio",
  maxRows = 10,
  minRows = 1,
  disabled = false,
  isPremium = false
}) {
  const [state, setState] = React.useState(value);
  const [dragOverIndex, setDragOverIndex] = React.useState(null);

  React.useEffect(() => {
    setState(value || defaultValue);
  }, [value]);

  const update = useCallback((next) => {
    setState(next);
    onChange?.(next);
  }, [onChange]);

  const handleFile = useCallback((rowIndex, colIndex, file) => {
    if (!file || disabled) return;

    // Basic file validation
    if (
      !file.type.startsWith('image/') &&
      !file.type.startsWith('video/') &&
      !file.type.startsWith('audio/') &&
      file.type !== 'application/pdf'
    ) {
      alert('Please select an image, video, audio, or PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('File size must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const rows = state.rows.map((r, rIdx) =>
        rIdx === rowIndex
          ? { ...r, images: r.images.map((img, cIdx) => (cIdx === colIndex ? e.target.result : img)) }
          : r
      );
      update({ rows });
    };
    reader.onerror = () => alert('Error reading file');
    reader.readAsDataURL(file);
  }, [state.rows, update, disabled]);

  const handlePrice = useCallback((rowIndex, price) => {
    if (disabled) return;
    const rows = state.rows.map((r, rIdx) => (rIdx === rowIndex ? { ...r, price } : r));
    update({ rows });
  }, [state.rows, update, disabled]);

  const addRow = useCallback(() => {
    if (disabled || state.rows.length >= maxRows) return;
    const nextRow = { images: Array(5).fill(null), price: "" };
    update({ rows: [...state.rows, nextRow] });
  }, [state.rows, update, maxRows, disabled]);

  const removeRow = useCallback((rowIndex) => {
    if (disabled || state.rows.length <= minRows) return;
    const rows = state.rows.filter((_, idx) => idx !== rowIndex);
    update({ rows: rows.length ? rows : [{ images: Array(5).fill(null), price: "" }] });
  }, [state.rows, update, minRows, disabled]);

  const clearImage = useCallback((rowIndex, colIndex) => {
    if (disabled) return;
    const rows = state.rows.map((r, rIdx) =>
      rIdx === rowIndex
        ? { ...r, images: r.images.map((img, cIdx) => (cIdx === colIndex ? null : img)) }
        : r
    );
    update({ rows });
  }, [state.rows, update, disabled]);

  const handleDragOver = useCallback((e, index) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e, rowIndex, colIndex) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(rowIndex, colIndex, files[0]);
    }
  }, [handleFile, disabled]);

  const canAddRow = !disabled && state.rows.length < maxRows;
  const canRemoveRow = !disabled && state.rows.length > minRows;

  return (
    <div className={`pps ${disabled ? 'pps--disabled' : ''}`}>
      {/* <div className="pps-header">
        <h3 className="pps-title">{title}</h3>
        <div className="pps-subtitle">Add up to {maxRows} project rows with images and pricing</div>
      </div> */}

      <div className="pps-content">
        {state.rows.map((row, rowIndex) => (
          <div className="pps-row" key={rowIndex}>
            <div className="pps-row-header">
              <span className="pps-row-number">Project {rowIndex + 1}</span>
              {canRemoveRow && (
                <button
                  type="button"
                  className="pps-remove-row"
                  onClick={() => removeRow(rowIndex)}
                  aria-label={`Remove project ${rowIndex + 1}`}
                  title="Remove"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                </button>
              )}
            </div>

            <div className="pps-row-content">
              <div className={`pps-grid ${isPremium ? 'pps-grid--premium' : 'pps-grid--basic'}`}>
                {row.images.map((img, colIndex) => {
                  const isLockedSlot = !isPremium && colIndex >= 3;

                  return (
                    <label
                      className={`pps-slot ${dragOverIndex === `${rowIndex}-${colIndex}` ? 'pps-slot--drag-over' : ''} ${isLockedSlot ? 'pps-slot--locked' : ''}`}
                      key={colIndex}
                      onDragOver={!isLockedSlot ? (e) => handleDragOver(e, `${rowIndex}-${colIndex}`) : undefined}
                      onDragLeave={!isLockedSlot ? handleDragLeave : undefined}
                      onDrop={!isLockedSlot ? (e) => handleDrop(e, rowIndex, colIndex) : undefined}
                    >
                      {isLockedSlot ? (
                        <div className="pps-premium-lock">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="pps-lock-icon">
                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z" />
                          </svg>
                          <span className="pps-premium-text">Premium</span>
                          <span className="pps-premium-subtext">Upgrade to unlock</span>
                        </div>
                      ) : img ? (
                        <div className="pps-image-container">
                          {String(img).startsWith('data:video') ? (
                            <video src={img} className="pps-media" muted controls />
                          ) : String(img).startsWith('data:audio') ? (
                            <audio src={img} className="pps-audio" controls />
                          ) : String(img).startsWith('data:application/pdf') ? (
                            <a href={img} target="_blank" rel="noopener noreferrer" className="pps-doc">
                              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" opacity=".2" />
                                <path d="M14 2v6h6" />
                                <path d="M6 22h12a2 2 0 0 0 2-2V8l-6-6H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2z" />
                              </svg>
                              <span className="pps-doc-label">PDF</span>
                            </a>
                          ) : (
                            <img src={img} alt={`can't load`} />
                          )}
                          <button
                            type="button"
                            className="pps-clear-image"
                            onClick={(e) => {
                              e.preventDefault();
                              clearImage(rowIndex, colIndex);
                            }}
                            aria-label="Remove image"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="pps-placeholder">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="pps-icon">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                          </svg>
                          <span className="pps-placeholder-text">Add Media</span>
                          <span className="pps-drag-text">or drag & drop</span>
                        </div>
                      )}
                      {!isLockedSlot && (
                        <input
                          type="file"
                          accept="image/*,video/*,audio/*,application/pdf,.pdf"
                          onChange={(e) => handleFile(rowIndex, colIndex, e.target.files[0])}
                          style={{ display: "none" }}
                          disabled={disabled}
                        />
                      )}
                    </label>
                  );
                })}
              </div>

              <div className="pps-price-section">
                <label className="pps-price-label">Project Value</label>
                <div className="pps-price-input-container">
                  <input
                    className="pps-price-input"
                    type="text"
                    placeholder="e.g. 1,00,000"
                    value={row.price}
                    onChange={(e) => handlePrice(rowIndex, e.target.value)}
                    disabled={disabled}
                  />
                  <span className="pps-currency">₹</span>
                </div>
                {/* <div className="pps-price-help">Estimated project cost</div> */}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pps-actions">
        <button
          type="button"
          className="pps-add-row"
          onClick={addRow}
          disabled={!canAddRow}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          Add Project Row
        </button>
        <div className="pps-counter">
          {state.rows.length} of {maxRows} rows
        </div>
      </div>
    </div>
  );
}

export default ProjectsPortfolioSelector;