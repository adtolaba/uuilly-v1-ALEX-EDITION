/*
 * Copyright (c) 2026 Gustavo Alejandro Medde.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE.md in the project root for more information.
 */

import React from 'react';

/**
 * A blinking cursor component to indicate that text is being streamed.
 */
const ActiveCursor = () => {
  return (
    <span className="inline-block w-[2px] h-[1em] ml-1 bg-primary animate-pulse align-middle" aria-hidden="true" />
  );
};

export default ActiveCursor;
