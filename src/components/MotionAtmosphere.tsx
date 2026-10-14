import React from 'react';

export type MotionAtmosphereType = 'nebula' | 'rain' | 'aurora' | 'embers' | 'sakura';

/** Slow light movement keeps the artwork intact without tiled particles. */
export const MotionAtmosphere: React.FC<{type: MotionAtmosphereType}> = ({type}) => (
  <div className={`motion-atmosphere-layer atmosphere-soft atmosphere-soft-${type}`} aria-hidden="true">
    <i/><i/>
  </div>
);
