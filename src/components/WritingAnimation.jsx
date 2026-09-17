import './WritingAnimation.css';

/**
 * Cartoon character writing notes animation
 * Rendered entirely with CSS + SVG — no external assets needed.
 */
export default function WritingAnimation() {
  return (
    <div className="writer-scene">
      {/* Floating sparkles */}
      <div className="sparkle s1">✦</div>
      <div className="sparkle s2">✦</div>
      <div className="sparkle s3">✦</div>
      <div className="sparkle s4">★</div>

      {/* Desk */}
      <div className="desk">
        {/* Notepad on desk */}
        <div className="notepad">
          <div className="notepad-rings">
            <div className="ring" /><div className="ring" /><div className="ring" />
          </div>
          <div className="notepad-lines">
            <div className="note-line l1" />
            <div className="note-line l2" />
            <div className="note-line l3" />
            <div className="note-line l4" />
            <div className="note-line l5" />
          </div>
          {/* Pencil writing */}
          <div className="pencil-wrap">
            <div className="pencil">
              <div className="pencil-tip" />
              <div className="pencil-body" />
              <div className="pencil-eraser" />
            </div>
          </div>
        </div>

        {/* Coffee cup */}
        <div className="coffee-cup">
          <div className="cup-body" />
          <div className="cup-handle" />
          <div className="steam st1" />
          <div className="steam st2" />
          <div className="steam st3" />
        </div>
      </div>

      {/* Character body */}
      <div className="character">
        {/* Head */}
        <div className="char-head">
          <div className="char-hair" />
          <div className="char-face">
            <div className="char-eye left-eye"><div className="pupil" /></div>
            <div className="char-eye right-eye"><div className="pupil" /></div>
            <div className="char-mouth" />
          </div>
        </div>

        {/* Body */}
        <div className="char-body">
          <div className="char-arm left-arm"><div className="char-hand" /></div>
          <div className="char-arm right-arm"><div className="char-hand" /></div>
        </div>
      </div>

      {/* Floating thought bubbles */}
      <div className="thought-bubble tb1">
        <span className="thought-text">📚 Phases…</span>
      </div>
      <div className="thought-bubble tb2">
        <span className="thought-text">🎯 Goals…</span>
      </div>
      <div className="thought-bubble tb3">
        <span className="thought-text">🚀 Projects…</span>
      </div>
    </div>
  );
}
