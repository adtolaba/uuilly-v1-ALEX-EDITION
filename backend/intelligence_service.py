# Copyright (c) 2026 Gustavo Alejandro Medde.
# Licensed under the Apache License, Version 2.0.
# See LICENSE.md in the project root for more information.

import httpx
import logging
import json
from typing import Optional, List, Dict, Any
from prisma import Prisma
import security

logger = logging.getLogger(__name__)

class IntelligenceService:
    """
    Centralized service for AI-powered operations (titling, memory extraction, etc.).
    Uses credentials stored in the database.
    """

    def __init__(self, prisma: Prisma):
        self.prisma = prisma

    async def get_active_credential(self, task: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves the first active credential that supports the specified task.
        Returns a dict with decrypted api_key and provider name.
        """
        try:
            # We fetch all active credentials and filter in Python because 
            # Prisma Python's json filter support varies by version/type.
            creds = await self.prisma.aicredentials.find_many(
                where={"is_active": True}
            )

            if not creds:
                logger.warning(f"No active AI credentials found in database.")
                return None

            selected_cred = None
            for c in creds:
                try:
                    tasks = json.loads(c.tasks) if isinstance(c.tasks, str) else c.tasks
                    if task in tasks:
                        selected_cred = c
                        break
                except: continue

            # Fallback: if no specific task assignment, get the first active credential
            if not selected_cred:
                selected_cred = creds[0]

            decrypted_key = security.decrypt_secret(selected_cred.api_key)
            return {
                "provider": selected_cred.provider,
                "api_key": decrypted_key,
                "model": None # Will use default for provider if not specified
            }
        except Exception as e:
            logger.error(f"Error retrieving active credential for {task}: {e}")
            return None

    async def generate_title(self, user_message: str, agent_response: str, custom_prompt: Optional[str] = None) -> Optional[str]:
        """Generates a title using centralized credentials."""
        cred = await self.get_active_credential("titling")
        if not cred:
            return None

        # Logic for prompt construction (Parity with previous implementation)
        combined_text = f"User: {user_message}\nAgent: {agent_response}"
        truncated = (combined_text[:500] + '...') if len(combined_text) > 500 else combined_text

        if custom_prompt:
            # If custom prompt has placeholder {message}, use it, otherwise append content
            if "{message}" in custom_prompt:
                full_prompt = custom_prompt.replace("{message}", truncated)
            else:
                full_prompt = f"{custom_prompt}\n\nContent to summarize: {truncated}"
        else:
            # Default internal prompt
            default_instr = "Create a very short, concise title (max 5 words) for this conversation based on the content. No quotes."
            full_prompt = f"{default_instr}\n\nContent:\n{truncated}"

        try:
            result = None
            provider = cred["provider"].lower()
            if provider == "openai":
                result = await self._call_openai(None, cred["api_key"], full_prompt, max_tokens=20)
            elif provider in ["google", "gemini"]:
                result = await self._call_google(None, cred["api_key"], full_prompt, max_tokens=20)
            elif provider == "mistral":
                result = await self._call_mistral(None, cred["api_key"], full_prompt, max_tokens=20)
            
            if result:
                # Rigorous stripping of quotes
                return result.strip().strip('"').strip("'").strip('`')
        except Exception as e:
            logger.error(f"Error generating title in IntelligenceService: {e}")
            
        return None

    async def filter_relevance(self, user_message: str, memories: List[Any], top_n: int = 10) -> List[Any]:
        """
        Uses an LLM to select the most relevant memories for the current user message.
        Returns a filtered list of AgentMemory objects.
        """
        if not memories:
            return []
        
        # If very few memories, skip LLM filtering and just return them all
        if len(memories) <= 5:
            return memories

        cred = await self.get_active_credential("filtering")
        if not cred:
            # Fallback to returning top-N by recency if LLM fails
            return memories[:top_n]

        # Prepare a numbered list of facts for the LLM
        facts_list = "\n".join([f"[{i}] {m.fact}" for i, m in enumerate(memories)])
        
        prompt = f"""You are a relevance filter. Given a list of 'MEMORIES' and a 'USER MESSAGE', your task is to identify the IDs of the most relevant memories that would help an AI agent provide a better response.

USER MESSAGE: "{user_message}"

MEMORIES:
{facts_list}

INSTRUCTIONS:
- Select up to {top_n} most relevant memory IDs.
- Relevance means the memory contains information directly related to the user's query or provides necessary context.
- Output ONLY a comma-separated list of IDs (e.g., 0, 3, 7).
- If no memories are relevant, output an empty string.
"""

        try:
            response = await self._call_llm(cred, prompt, max_tokens=50)
            if not response or not response.strip():
                return []

            # Parse IDs from comma-separated response
            import re
            ids = [int(i.strip()) for i in re.split(r'[,\s]+', response) if i.strip().isdigit()]
            
            # Reconstruct filtered list based on selected indices
            filtered = []
            for i in ids:
                if 0 <= i < len(memories):
                    filtered.append(memories[i])
            
            return filtered[:top_n]
        except Exception as e:
            logger.error(f"Error filtering relevance in IntelligenceService: {e}")
            return memories[:top_n]

    async def atomize_content(self, content: str, provider: str, api_key: str, model: Optional[str] = None) -> List[str]:
        """
        Takes a long text and breaks it down into atomic facts/instructions for memory storage.
        """
        cred = {"provider": provider, "api_key": api_key}
        
        # We split long content into chunks to avoid context window issues
        # Using a larger window for chunking to keep context
        import re
        # Split by sections (numbers followed by dot or double newlines)
        chunks = re.split(r'\n\s*\n', content)
        chunks = [c.strip() for c in chunks if c.strip()]
        
        all_facts = []
        for chunk in chunks:
            if len(chunk) < 10: continue
            
            prompt = f"""You are a knowledge atomization engine. Your task is to extract clear and self-contained atomic facts or instructions from the provided TEXT.

TEXT:
\"\"\"
{chunk}
\"\"\"

CRITICAL INSTRUCTIONS:
- Each fact must contain ALL necessary context to be understood independently.
- GROUP RELATED POINTS: If the text describes a multi-step process, a list of sub-rules, or a set of related constraints (e.g., "Rule 1: A, B and C"), you MUST group them into a single coherent FACT instead of breaking them into tiny fragments.
- DO NOT simply copy-paste lines. Synthesize them into a complete instruction.
- Maintain the original language of the text.
- Output format: FACT:: [The complete consolidated fact or rule]
- Output ONLY the FACT:: lines, one per entry.
"""
            try:
                response = await self._call_llm(cred, prompt, model=model, max_tokens=500)
                if response:
                    for line in response.split("\n"):
                        if line.startswith("FACT::"):
                            all_facts.append(line[6:].strip())
                        elif line.startswith("FACT:"): # Legacy/LLM drift support
                            all_facts.append(line[5:].strip())
            except Exception as e:
                logger.error(f"Error atomizing chunk: {e}")
                
        return all_facts

    async def extract_facts(self, message_content: str, agent_id: int, user_id: int, context: str = "") -> List[Dict[str, Any]]:
        """
        Extracts and consolidates atomic facts from message content.
        Returns a list of command dicts: {"type": "fact|update|delete", "content": ..., "old_content": ...}
        """
        # 1. Get Settings
        from services import SettingsService
        settings_service = SettingsService(self.prisma)
        settings = await settings_service.get_settings()

        # 2. Get Existing Facts for context
        from memory_service import MemoryService
        memory_service = MemoryService(self.prisma)
        memories = await memory_service.get_relevant_facts(agent_id, user_id)
        
        facts_context = "EXISTING FACTS:\n" + "\n".join([f"- [{m.id}] {m.fact}" for m in memories[:30]]) if memories else "EXISTING FACTS: None."

        # 3. Get Credential
        cred = None
        active_cred_id = getattr(settings, "active_extraction_cred_id", None)
        if active_cred_id:
            db_cred = await self.prisma.aicredentials.find_unique(where={"id": active_cred_id})
            if db_cred and db_cred.is_active:
                decrypted_key = security.decrypt_secret(db_cred.api_key)
                cred = {
                    "provider": db_cred.provider,
                    "api_key": decrypted_key,
                    "model": settings.memory_extraction_model
                }

        if not cred:
            cred = await self.get_active_credential("extraction")
            if cred and settings.memory_extraction_model:
                cred["model"] = settings.memory_extraction_model
            
        if not cred: return []

        prompt = settings.memory_extraction_prompt or "You are a memory consolidation engine..."
        
        full_input = f"{facts_context}\n\nNEW MESSAGE:\n{message_content}"
        
        # If custom prompt has placeholder {message}, use it
        if "{message}" in prompt:
            full_prompt = prompt.replace("{message}", full_input)
        else:
            full_prompt = f"{prompt}\n\n{full_input}"

        try:
            response_text = await self._call_llm(cred, full_prompt, model=cred.get("model"))
            if not response_text: return []

            commands = []
            for line in response_text.split("\n"):
                line = line.strip()
                if not line: continue
                
                # Robust prefix matching using clear delimiters
                if line.startswith("FACT::"):
                    content = line[6:].strip()
                    if content:
                        commands.append({"type": "fact", "content": content})
                elif line.startswith("UPDATE::"):
                    # Expected format: UPDATE:: [ID] TO:: [New]
                    try:
                        # We use TO:: as a delimiter to avoid confusion with content containing ' TO '
                        if " TO:: " in line:
                            parts = line[8:].split(" TO:: ")
                            if len(parts) == 2:
                                clean_id = parts[0].replace("[", "").replace("]", "").strip()
                                commands.append({
                                    "type": "update", 
                                    "fact_id": int(clean_id), 
                                    "content": parts[1].strip()
                                })
                        else:
                            # Fallback to standard ' TO ' if TO:: is missing, but prefer TO::
                            parts = line[8:].split(" TO ")
                            if len(parts) == 2:
                                clean_id = parts[0].replace("[", "").replace("]", "").strip()
                                commands.append({
                                    "type": "update", 
                                    "fact_id": int(clean_id), 
                                    "content": parts[1].strip()
                                })
                    except Exception as e:
                        logger.error(f"Error parsing UPDATE command: {line} - {e}")
                elif line.startswith("DELETE::"):
                    try:
                        clean_id = line[8:].replace("[", "").replace("]", "").strip()
                        if clean_id:
                            commands.append({"type": "delete", "fact_id": int(clean_id)})
                    except Exception as e:
                        logger.error(f"Error parsing DELETE command: {line} - {e}")
                
                # Legacy support for single colon (for transition)
                elif line.startswith("FACT:") and not line.startswith("FACT::"):
                    commands.append({"type": "fact", "content": line[5:].strip()})
                elif line.startswith("UPDATE:") and not line.startswith("UPDATE::"):
                    try:
                        parts = line[7:].split(" TO ")
                        if len(parts) == 2:
                            clean_id = parts[0].replace("[", "").replace("]", "").strip()
                            commands.append({
                                "type": "update", 
                                "fact_id": int(clean_id), 
                                "content": parts[1].strip()
                            })
                    except: pass
            
            return commands
        except Exception as e:
            logger.error(f"Error in extract_facts: {e}")
            return []

    async def _call_llm(self, cred: Dict[str, Any], prompt: str, model: Optional[str] = None, **kwargs) -> Optional[str]:
        """Generic LLM call wrapper."""
        provider = cred["provider"].lower()
        api_key = cred["api_key"]
        
        if provider == "openai":
            return await self._call_openai(model, api_key, prompt, **kwargs)
        elif provider in ["google", "gemini"]:
            return await self._call_google(model, api_key, prompt, **kwargs)
        elif provider == "mistral":
            return await self._call_mistral(model, api_key, prompt, **kwargs)
        return None

    async def _call_openai(self, model: str, api_key: str, prompt: str, max_tokens: int = 100) -> Optional[str]:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        payload = {
            "model": model or "gpt-4o-mini",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
            "temperature": 0.1
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=15.0)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()

    async def _call_google(self, model: str, api_key: str, prompt: str, max_tokens: int = 100) -> Optional[str]:
        model_name = model or "gemini-1.5-flash"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"maxOutputTokens": max_tokens, "temperature": 0.1}
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=15.0)
            response.raise_for_status()
            data = response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()

    async def _call_mistral(self, model: str, api_key: str, prompt: str, max_tokens: int = 100) -> Optional[str]:
        url = "https://api.mistral.ai/v1/chat/completions"
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        payload = {
            "model": model or "mistral-small-latest",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
            "temperature": 0.1
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=15.0)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
