import{j as e}from"./index-BYRj6bBo.js";const t={info:"Note",warning:"Heads up",success:"Win"},i=({title:s,tone:n="info",children:o})=>e.jsxs("div",{className:`callout callout-${n}`,children:[e.jsx("div",{className:"callout-header",children:s??t[n]}),e.jsx("div",{className:"callout-body",children:o})]}),l={title:"Microalchemy Primer",date:"2025-11-27T00:00:00.000Z",author:"Microalchemy Team",summary:"Why we are compressing silicon prototyping timelines and how we plan to ship it.",tags:["fabrication","tooling","roadmap"]};function a(s){const n={a:"a",h1:"h1",h2:"h2",li:"li",ol:"ol",p:"p",span:"span",strong:"strong",ul:"ul",...s.components};return e.jsxs(e.Fragment,{children:[e.jsxs(n.h1,{id:"microalchemy-primer",children:[e.jsx(n.a,{"aria-hidden":"true",tabIndex:"-1",href:"#microalchemy-primer",children:e.jsx(n.span,{className:"icon icon-link"})}),"MicroAlchemy Primer"]}),`
`,e.jsxs(n.p,{children:[`We're building tools and collapse the distance between an idea and working silicon. The goal is
simple: `,e.jsx(n.strong,{children:"cut fabrication lead times to weeks"})," so teams can iterate as fast on silicon as they do on code."]}),`
`,e.jsx(i,{tone:"info",title:"What we are shipping",children:e.jsx(n.p,{children:`Wafers in under three weeks, an open-source analog-first design stack (Alembic), and an ecosystem that
keeps the tooling, simulation, and fabrication loop tight.`})}),`
`,e.jsxs(n.h2,{id:"design-loops-should-be-shorter",children:[e.jsx(n.a,{"aria-hidden":"true",tabIndex:"-1",href:"#design-loops-should-be-shorter",children:e.jsx(n.span,{className:"icon icon-link"})}),"Design loops should be shorter"]}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsxs(n.li,{children:["Traditional foundries are focused on pushing the economics per transistor rather than design speed",`
`,e.jsxs(n.ul,{children:[`
`,e.jsx(n.li,{children:"It can take anywhere from three months to a full year to go from a finalized design to a chip in hand at today’s foundries"}),`
`]}),`
`]}),`
`,e.jsx(n.li,{children:"Analog design is still artisanal; we are raising the abstraction with Alembic."}),`
`,e.jsx(n.li,{children:"Tooling wants to be open; community contributions unlock better models and flows."}),`
`]}),`
`,e.jsxs(n.h2,{id:"how-we-approach-the-stack",children:[e.jsx(n.a,{"aria-hidden":"true",tabIndex:"-1",href:"#how-we-approach-the-stack",children:e.jsx(n.span,{className:"icon icon-link"})}),"How we approach the stack"]}),`
`,e.jsxs(n.ol,{children:[`
`,e.jsxs(n.li,{children:[e.jsx(n.strong,{children:"Language-first"}),": Alembic expresses analog intent without drowning in device minutiae."]}),`
`,e.jsxs(n.li,{children:[e.jsx(n.strong,{children:"Tight simulation"}),": We validate designs against the exact stack we fab on—no surprises at tapeout."]}),`
`,e.jsxs(n.li,{children:[e.jsx(n.strong,{children:"Fast fab"}),": Our process targets a 1μm node with reliable turnaround for experiments and MVP silicon."]}),`
`]}),`
`,e.jsx(i,{tone:"success",children:e.jsxs(n.p,{children:[`You will see progress logs, benchmarks, and build breakdowns here. If you want to collaborate or test on
our pipeline, email `,e.jsx(n.a,{href:"mailto:aditya@microalchemy.xyz",children:"aditya@microalchemy.xyz"})]})})]})}function c(s={}){const{wrapper:n}=s.components||{};return n?e.jsx(n,{...s,children:e.jsx(a,{...s})}):a(s)}export{c as default,l as frontmatter};
