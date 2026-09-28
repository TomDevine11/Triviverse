// The finish card's answer reveal: a small shouted label over the answer at
// headline size, so the thing players most want to know reads first after the
// verdict. `detail` is an optional muted line underneath (e.g. "Solved in 4/6").
export default function ResultAnswer({ label, children, detail }) {
  return (
    <div className="flex flex-col items-center mt-3 mb-2">
      <div className="text-[0.62rem] font-black tracking-[0.16em] uppercase text-muted">{label}</div>
      <div className="text-2xl md:text-[1.65rem] font-extrabold text-primary leading-tight mt-1.5">{children}</div>
      {detail && <div className="text-muted text-sm mt-1.5">{detail}</div>}
    </div>
  )
}
