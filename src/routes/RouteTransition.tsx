import { useEffect, useState, type PropsWithChildren } from "react";
import { Routes, useLocation } from "react-router";

type TransitionPhase = "entering" | "exiting";

export function RouteTransition({ children }: PropsWithChildren) {
  const location = useLocation();
  const [displayedLocation, setDisplayedLocation] = useState(location);
  const [phase, setPhase] = useState<TransitionPhase>("entering");

  useEffect(() => {
    const currentPath = `${location.pathname}${location.search}`;
    const displayedPath = `${displayedLocation.pathname}${displayedLocation.search}`;
    if (currentPath === displayedPath) return;

    setPhase("exiting");
    const timeout = window.setTimeout(() => {
      setDisplayedLocation(location);
      setPhase("entering");
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [location, displayedLocation]);

  return (
    <div className={`route-transition route-transition--${phase}`}>
      <Routes location={displayedLocation}>{children}</Routes>
    </div>
  );
}