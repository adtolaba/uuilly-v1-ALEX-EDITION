/*
 * Copyright (c) 2026 Gustavo Alejandro Medde.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE.md in the project root for more information.
 */

import React from 'react';

/**
 * A typing indicator to show the agent is generating or releasing text.
 */
const TypingIndicator = ({ agentName = 'Agent' }) => {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full animate-pulse italic">
        {agentName} está escribiendo...
      </div>
    </div>
  );
};

export default TypingIndicator;
