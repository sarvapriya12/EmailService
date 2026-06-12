import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}


//The function of this file is to provide a custom React hook called useIsMobile 
// that detects whether the user is on a mobile device based on the screen width.
// It uses the window.matchMedia API to listen for changes in the viewport width 
// and updates the isMobile state accordingly. The hook returns a boolean value 
// indicating whether the current device is considered mobile (screen width less than 768 pixels).