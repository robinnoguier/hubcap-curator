export default function Logo() {
  return (
    <div className="flex items-center justify-center gap-3">
      <img 
        src="/assets/hubbie.svg" 
        alt="Hubcap Logo" 
        className="w-14 h-14"
      />
      <img 
        src="/assets/wordmark.svg" 
        alt="Hubcap" 
        className="h-10"
      />
    </div>
  )
}