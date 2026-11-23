import * as React from "react"

const CSS = `
[data-framer-name="Corps article"] h1,
[data-framer-name="Corps article"] h2,
[data-framer-name="Corps article"] h3,
[data-framer-name="Corps article"] h4 { color: #1d1612 !important; }
[data-framer-name="Corps article"] p,
[data-framer-name="Corps article"] li,
[data-framer-name="Corps article"] span,
[data-framer-name="Corps article"] em,
[data-framer-name="Corps article"] strong { color: #3a3027 !important; }
[data-framer-name="Corps article"] strong { color: #1d1612 !important; }
[data-framer-name="Corps article"] a { color: #3f6b2c !important; text-decoration: underline; }
[data-framer-name="Corps article"] blockquote { border-left: 3px solid #4a7a36; padding-left: 16px; }
`

export default function ArticleClair() {
  return <style>{CSS}</style>
}
;(ArticleClair as any).defaultProps = { width: 1, height: 1 }
