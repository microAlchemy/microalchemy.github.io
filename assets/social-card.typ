// Deterministic 1200x630 social preview for Open Graph and Twitter/X.
// Regenerate with: npm run social-card

#set page(
  width: 1200pt,
  height: 630pt,
  margin: 0pt,
  fill: rgb("#02241a"),
)
#set text(font: "DejaVu Sans Mono")

#let gold = rgb("#d4af37")
#let cream = rgb("#f7f3e8")
#let muted = rgb("#c9d6d0")
#let trace = rgb("#5c4c1a")
#let background = rgb("#02241a")
#let via-radius = 9pt
#let trace-line(start, end) = place(line(start: start, end: end, stroke: 3pt + trace))
#let via(x, y) = place(
  dx: x - via-radius,
  dy: y - via-radius,
  circle(radius: via-radius, fill: background, stroke: 3pt + trace),
)

// Mirrored circuit traces frame the content without entering the title area.
// Every horizontal trace stops at the outer edge of its via, not its centre.
#trace-line((0pt, 70pt), (150pt, 70pt))
#trace-line((150pt, 70pt), (190pt, 110pt))
#trace-line((190pt, 110pt), (231pt, 110pt))
#via(240pt, 110pt)
#trace-line((969pt, 110pt), (1010pt, 110pt))
#trace-line((1010pt, 110pt), (1050pt, 70pt))
#trace-line((1050pt, 70pt), (1200pt, 70pt))
#via(960pt, 110pt)

#trace-line((0pt, 150pt), (35pt, 150pt))
#trace-line((35pt, 150pt), (55pt, 170pt))
#trace-line((55pt, 170pt), (71pt, 170pt))
#via(80pt, 170pt)
#trace-line((1129pt, 170pt), (1145pt, 170pt))
#trace-line((1145pt, 170pt), (1165pt, 150pt))
#trace-line((1165pt, 150pt), (1200pt, 150pt))
#via(1120pt, 170pt)

#trace-line((0pt, 280pt), (31pt, 280pt))
#via(40pt, 280pt)
#trace-line((1169pt, 280pt), (1200pt, 280pt))
#via(1160pt, 280pt)

#trace-line((0pt, 390pt), (45pt, 390pt))
#trace-line((45pt, 390pt), (65pt, 410pt))
#trace-line((65pt, 410pt), (81pt, 410pt))
#via(90pt, 410pt)
#trace-line((1119pt, 410pt), (1135pt, 410pt))
#trace-line((1135pt, 410pt), (1155pt, 390pt))
#trace-line((1155pt, 390pt), (1200pt, 390pt))
#via(1110pt, 410pt)

#trace-line((0pt, 500pt), (110pt, 500pt))
#trace-line((110pt, 500pt), (140pt, 470pt))
#trace-line((140pt, 470pt), (181pt, 470pt))
#via(190pt, 470pt)
#trace-line((1019pt, 470pt), (1060pt, 470pt))
#trace-line((1060pt, 470pt), (1090pt, 500pt))
#trace-line((1090pt, 500pt), (1200pt, 500pt))
#via(1010pt, 470pt)

#trace-line((0pt, 575pt), (160pt, 575pt))
#trace-line((160pt, 575pt), (210pt, 525pt))
#trace-line((210pt, 525pt), (241pt, 525pt))
#via(250pt, 525pt)
#trace-line((959pt, 525pt), (990pt, 525pt))
#trace-line((990pt, 525pt), (1040pt, 575pt))
#trace-line((1040pt, 575pt), (1200pt, 575pt))
#via(950pt, 525pt)

// This is the repository's official solid-gold mark. Supplying only a height
// preserves its original aspect ratio.
#place(
  dx: 820pt,
  dy: 188pt,
  image("../src/img/ua-solid-gold.svg", height: 150pt, fit: "contain"),
)

#place(dx: 284pt, dy: 130pt, text(size: 28pt, weight: "bold", fill: gold)[MICROALCHEMY])
#place(dx: 284pt, dy: 198pt, text(size: 52pt, weight: "medium", fill: cream)[Rapid silicon])
#place(dx: 284pt, dy: 264pt, text(size: 52pt, weight: "medium", fill: cream)[prototyping])
#place(dx: 284pt, dy: 349pt, text(size: 26pt, fill: muted)[Open-source EDA and fast fabrication])
#place(dx: 284pt, dy: 433pt, text(size: 21pt, weight: "bold", fill: gold)[microalchemy.xyz])
