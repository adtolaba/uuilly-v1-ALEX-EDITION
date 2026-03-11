/*
 * Copyright (c) 2026 Gustavo Alejandro Medde.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE.md in the project root for more information.
 */

import React, { useState, useEffect, useRef } from "react"
import EmojiPicker from 'emoji-picker-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Switch } from "@/components/ui/switch"
import { X, Bot, Tag, Check, ChevronDown, Lock, Smile, BrainCircuit } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getTagColor, cn } from "@/lib/utils"
import useUI from "../../hooks/useUI"

/**
 * AgentForm component for creating or editing AI assistant configurations.
 * @param {Object} props
 * @param {Object} props.agent The agent to edit, or null for a new agent.
 * @param {boolean} props.open Whether the form sheet is open.
 * @param {function} props.onOpenChange Callback when the open state changes.
 * @param {function} props.onSuccess Callback when the agent is successfully saved.
 * @returns {JSX.Element}
 */
export function AgentForm({ agent, open, onOpenChange, onSuccess }) {
  const ui = useUI()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("") // New state for description
  const [type, setType] = useState("n8n")
  const [url, setUrl] = useState("")
  const [flowiseHost, setFlowiseHost] = useState("http://localhost:3001")
  const [flowiseId, setFlowiseId] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [isStreamingEnabled, setIsStreamingEnabled] = useState(false)
  const [icon, setIcon] = useState("")
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const [agentAuthStrategy, setAgentAuthStrategy] = useState("NONE")
  const [agentAuthHeaderName, setAgentAuthHeaderName] = useState("X-Api-Key")
  const [agentAuthSecret, setAgentAuthSecret] = useState("")
  const [memoryEnabled, setMemoryEnabled] = useState(false)
  const [memoryScope, setMemoryScope] = useState("INDIVIDUAL")
  const [tags, setTags] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [allGlobalTags, setAllGlobalTags] = useState([])
  const [hasMemoryCredentials, setHasMemoryCredentials] = useState(true)

  useEffect(() => {
    fetchGlobalTags()
    fetchAICredentials()
  }, [])

  const fetchGlobalTags = async () => {
    try {
      const token = localStorage.getItem("access_token")
      const response = await fetch("/api/v1/tags", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setAllGlobalTags(data)
      }
    } catch (error) {
      console.error("Error fetching global tags:", error)
    }
  }

  const fetchAICredentials = async () => {
    try {
      const token = localStorage.getItem("access_token")
      const response = await fetch("/api/v1/ai-credentials", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        // Check if there is at least one active credential for extraction
        const hasExtraction = data.some(c => 
          c.is_active && (typeof c.tasks === 'string' ? JSON.parse(c.tasks) : c.tasks).includes('extraction')
        )
        setHasMemoryCredentials(hasExtraction)
        
        // If no credentials, ensure memory is disabled for NEW agents
        if (!hasExtraction && !agent) {
          setMemoryEnabled(false)
        }
      }
    } catch (error) {
      console.error("Error fetching AI credentials:", error)
    }
  }

  useEffect(() => {
    if (agent) {
      setName(agent.name || "")
      setDescription(agent.description || "") // Initialize description
      setType(agent.type || "n8n")
      setIsActive(agent.is_active ?? true)
      setIsStreamingEnabled(agent.is_streaming_enabled ?? false)
      setIcon(agent.icon || "")
      setAgentAuthStrategy(agent.agent_auth_strategy || "NONE")
      setAgentAuthHeaderName(agent.agent_auth_header_name || "X-Api-Key")
      setAgentAuthSecret(agent.agent_auth_secret || "")
      setMemoryEnabled(agent.memory_enabled || false)
      setMemoryScope(agent.memory_scope || "INDIVIDUAL")
      setTags(agent.tags ? agent.tags.map(t => typeof t === 'string' ? t : t.name) : [])
      
      if (agent.type === 'flowise' && agent.url) {
        const parts = agent.url.split('/api/v1/prediction/');
        if (parts.length === 2) {
          setFlowiseHost(parts[0]);
          setFlowiseId(parts[1]);
        } else {
          setUrl(agent.url);
        }
      } else {
        setUrl(agent.url || "");
      }
    } else {
      setName("")
      setDescription("") // Reset description
      setType("n8n")
      setUrl("")
      setFlowiseHost("http://localhost:3001")
      setFlowiseId("")
      setIsActive(true)
      setIsStreamingEnabled(false)
      setIcon("")
      setAgentAuthStrategy("NONE")
      setAgentAuthHeaderName("X-Api-Key")
      setAgentAuthSecret("")
      setMemoryEnabled(false)
      setMemoryScope("INDIVIDUAL")
      setTags([])
    }
  }, [agent, open])

  const toggleTag = (tagName) => {
    if (tags.includes(tagName)) {
      setTags(tags.filter(t => t !== tagName))
    } else {
      setTags([...tags, tagName])
    }
  }

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    const token = localStorage.getItem("access_token")
    const method = agent ? "PUT" : "POST"
    const url_api = agent ? `/api/v1/agents/${agent.id}` : "/api/v1/agents"

    let finalUrl = url;
    if (type === 'flowise') {
      const host = flowiseHost.replace(/\/$/, '');
      finalUrl = `${host}/api/v1/prediction/${flowiseId}`;
    }

    const body = {
      name,
      description,
      type,
      url: finalUrl,
      is_active: isActive,
      is_streaming_enabled: isStreamingEnabled,
      icon,
      agent_auth_strategy: agentAuthStrategy,
      agent_auth_header_name: agentAuthStrategy === "HEADER" ? agentAuthHeaderName : null,
      agent_auth_secret: agentAuthSecret,
      memory_enabled: memoryEnabled,
      memory_scope: memoryScope,
      config: "{}",
      tags: tags
    }

    try {
      const response = await fetch(url_api, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        ui.toast.success(`Agent ${name} saved successfully`)
        onSuccess()
        onOpenChange(false)
      } else {
        const errorData = await response.json()
        ui.toast.error(errorData.detail || "Error saving agent")
      }
    } catch (error) {
      console.error("Error saving agent:", error)
      ui.toast.error("Connection error")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[450px] overflow-y-auto custom-scrollbar">
        <form onSubmit={handleSubmit}>
          <SheetHeader>
            <div className="flex items-center gap-2">
              <Bot className="h-6 w-6 text-primary" />
              <SheetTitle>{agent ? "Edit Agent" : "Create New Agent"}</SheetTitle>
            </div>
            <SheetDescription className="sr-only">
              Form to manage agent configuration.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-end gap-3">
              <div className="grid gap-2 flex-1">
                <label htmlFor="agent-name" className="text-sm font-medium">Name</label>
                <Input
                  id="agent-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Asistente de Marketing"
                  required
                  autoComplete="off"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Icon</label>
                <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      type="button"
                      className="h-10 w-10 p-0 flex items-center justify-center text-xl"
                      title="Select Emoji"
                    >
                      {icon || <Bot className="h-5 w-5 text-muted-foreground" />}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-[350px] p-0 border-none shadow-xl overflow-hidden" 
                    align="end"
                    onWheel={(e) => e.stopPropagation()}
                  >
                    <EmojiPicker 
                      onEmojiClick={(emojiData) => {
                        setIcon(emojiData.emoji);
                        setIsEmojiPickerOpen(false);
                      }}
                      autoFocusSearch={false}
                      theme="auto"
                      width="100%"
                      height={400}
                    />
                    {icon && (
                      <div className="p-2 border-t bg-muted/20 flex justify-center">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-2"
                          onClick={() => {
                            setIcon("");
                            setIsEmojiPickerOpen(false);
                          }}
                        >
                          <X className="h-3 w-3" />
                          Reset to Default Bot
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor="agent-description" className="text-sm font-medium">Description</label>
              <Input
                id="agent-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of the agent's purpose."
                autoComplete="off"
              />
            </div>

            <div className="grid gap-2 relative">
              <label className="text-sm font-medium">Required Tags</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between font-normal text-muted-foreground hover:text-foreground"
                  >
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      <span>Select tags...</span>
                    </div>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[300px] max-h-[300px] overflow-y-auto custom-scrollbar" align="start">
                  <DropdownMenuLabel>Available Tags</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {allGlobalTags.length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground italic text-center">No tags available</div>
                  ) : (
                    allGlobalTags.map((tag) => (
                      <DropdownMenuCheckboxItem
                        key={tag.id}
                        checked={tags.includes(tag.name)}
                        onCheckedChange={() => toggleTag(tag.name)}
                        onSelect={(e) => e.preventDefault()} // Keep open
                      >
                        {tag.name}
                      </DropdownMenuCheckboxItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tag) => {
                  const colors = getTagColor(tag);
                  return (
                    <Badge 
                      key={tag} 
                      variant="outline" 
                      className={cn("pl-2 pr-1 py-0.5 gap-1 group transition-all border", colors.bg, colors.text, colors.border)}
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="rounded-full opacity-60 hover:opacity-100 hover:bg-muted p-0.5 transition-all"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
                {tags.length === 0 && (
                  <span className="text-[10px] 3xl:text-xs text-muted-foreground italic">No tags assigned</span>
                )}
              </div>
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="agent-type" className="text-sm font-medium">Provider Type</label>
              <Select 
                value={type} 
                onValueChange={(val) => {
                  setType(val);
                  setAgentAuthStrategy("NONE");
                  // Pre-populate URL if Flowise and new agent
                  if (val === 'flowise' && !agent) {
                    setFlowiseHost("http://flowise:3001");
                  }
                }}
              >
                <SelectTrigger id="agent-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="n8n">n8n</SelectItem>
                  <SelectItem value="flowise">Flowise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {type === 'n8n' ? (
              <div className="grid gap-2">
                <label htmlFor="agent-url" className="text-sm font-medium">Webhook URL (n8n)</label>
                <Input
                  id="agent-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="http://n8n:5678/webhook/..."
                  required
                  autoComplete="off"
                />
              </div>
            ) : (
              <>
                <div className="grid gap-2">
                  <label htmlFor="flowise-host" className="text-sm font-medium">Flowise Host</label>
                  <Input
                    id="flowise-host"
                    value={flowiseHost}
                    onChange={(e) => setFlowiseHost(e.target.value)}
                    placeholder="http://localhost:3001"
                    required
                    autoComplete="off"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="flowise-id" className="text-sm font-medium">Flowise Chatflow ID</label>
                  <Input
                    id="flowise-id"
                    value={flowiseId}
                    onChange={(e) => setFlowiseId(e.target.value)}
                    placeholder="a1b2c3d4..."
                    required
                    autoComplete="off"
                  />
                </div>
              </>
            )}

            <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <label className="text-sm font-medium">Active Status</label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <label className="text-sm font-medium">Enable Streaming</label>
              <Switch checked={isStreamingEnabled} onCheckedChange={setIsStreamingEnabled} />
            </div>

            {/* Persistent Memory Section */}
            <TooltipProvider>
              <div className="space-y-3 rounded-lg border p-3 shadow-sm bg-primary/5 border-primary/10">
                <div className="flex flex-row items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <BrainCircuit className="h-4 w-4 text-primary" />
                      Persistent Memory
                    </label>
                    <p className="text-[10px] text-muted-foreground italic">Alex aprende y recuerda hechos sobre los usuarios.</p>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center">
                        <Switch 
                          checked={memoryEnabled} 
                          onCheckedChange={setMemoryEnabled} 
                          disabled={!hasMemoryCredentials}
                        />
                      </div>
                    </TooltipTrigger>
                    {!hasMemoryCredentials && (
                      <TooltipContent side="left" className="max-w-[200px] text-xs">
                        <p>Memory cannot be enabled because no active AI credentials with 'Memory Extraction' task were found. Please configure them in the AI settings.</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </div>
                
                {memoryEnabled && (
                  <div className="grid gap-2 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="text-xs font-medium text-muted-foreground">Memory Scope</label>
                    <Select value={memoryScope} onValueChange={setMemoryScope}>
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INDIVIDUAL">Individual (Per User)</SelectItem>
                        <SelectItem value="GLOBAL">Global (Shared by all)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </TooltipProvider>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="auth" className="border rounded-lg px-3">
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Authentication (Optional)</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-1 pb-4 space-y-4">
                  <div className="grid gap-2">
                    <label className="text-xs font-medium text-muted-foreground">Strategy</label>
                    <Select value={agentAuthStrategy} onValueChange={setAgentAuthStrategy}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select strategy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">None (Public)</SelectItem>
                        {type === 'n8n' && (
                          <SelectItem value="HEADER">Header Auth (n8n)</SelectItem>
                        )}
                        {type === 'flowise' && (
                          <SelectItem value="BEARER">API Key (Flowise)</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {agentAuthStrategy !== "NONE" && (
                    <>
                      {agentAuthStrategy === "HEADER" && (
                        <div className="grid gap-2">
                          <label htmlFor="auth-header" className="text-xs font-medium text-muted-foreground">Name (Header)</label>
                          <Input
                            id="auth-header"
                            value={agentAuthHeaderName}
                            onChange={(e) => setAgentAuthHeaderName(e.target.value)}
                            placeholder="X-Api-Key"
                            className="h-8"
                            autoComplete="off"
                          />
                        </div>
                      )}
                      <div className="grid gap-2">
                        <label htmlFor="auth-secret" className="text-xs font-medium text-muted-foreground">
                          {agentAuthStrategy === "HEADER" ? "Value" : "API Key"}
                        </label>
                        <Input
                          id="auth-secret"
                          type="password"
                          value={agentAuthSecret}
                          onChange={(e) => setAgentAuthSecret(e.target.value)}
                          placeholder="••••••••"
                          className="h-8"
                          autoComplete="off"
                        />
                      </div>
                    </>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          <SheetFooter className="pt-4 border-t">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : (agent ? "Update Agent" : "Create Agent")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

